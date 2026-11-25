export type ToolView = 'encode' | 'decode';

export interface SnippetSpec {
  id: 'encode' | 'decode';
}

export interface HistoryEntry {
  /** Short human readable description of the generated or decoded header. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Active view: generate a header or decode an existing one. */
  view: ToolView;
  /** Username for the Basic header. */
  username: string;
  /** Password for the Basic header. */
  password: string;
  /** Whether the password input is masked. */
  maskPassword: boolean;
  /** Pasted Basic header or token for the decode view. */
  decodeInput: string;
  /** Saved entries, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  view: 'encode',
  username: '',
  password: '',
  maskPassword: true,
  decodeInput: '',
  history: [],
};

export const MAX_HISTORY = 20;

export const VIEWS: { value: ToolView; label: string; hint: string }[] = [
  { value: 'encode', label: 'Generate', hint: 'build a Basic header from credentials' },
  { value: 'decode', label: 'Decode', hint: 'reveal the credentials inside a Basic header' },
];

function b64encode(value: string): string {
  if (typeof TextEncoder !== 'undefined') {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte ?? 0);
    return btoa(binary);
  }
  return Buffer.from(value, 'utf-8').toString('base64');
}

function b64decode(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(bytes).toString('utf-8');
}

/** Base64 for JS strings that also works in Node during tests. */
export const encodeBase64 = (value: string): string => b64encode(value);
export const decodeBase64 = (value: string): string => b64decode(value);

/**
 * Build the full Authorization header value: "Basic <base64(user:pass)>".
 * Returns null when username or password is empty.
 */
export function authHeaderValue(username: string, password: string): string | null {
  if (!username || !password) return null;
  return `Basic ${encodeBase64(`${username}:${password}`)}`;
}

/**
 * Decode a pasted "Basic xxx" header line or bare token into
 * { username, password }. Returns null for anything not valid Basic auth.
 */
export function decodeBasicHeader(input: string): { username: string; password: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = /^basic\s+(\S+)$/i.exec(trimmed);
  const token = match?.[1] ?? trimmed;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(token)) return null;
  let decoded: string;
  try {
    decoded = decodeBase64(token);
  } catch {
    return null;
  }
  const separator = decoded.indexOf(':');
  if (separator < 0) return null;
  return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

/** URL-encode a value for use in https://user:pass@host credentials. */
export function urlEncodeCredential(value: string): string {
  return encodeURIComponent(value);
}

/** Validate a username/password pair; returns human-readable hints. */
export function validationHints(username: string, password: string): string[] {
  const hints: string[] = [];
  if (!username.trim()) hints.push('Username is required.');
  if (!password) hints.push('Password is required.');
  if (/[^\x21-\x7e]/.test(username) || /[^\x21-\x7e]/.test(password)) {
    hints.push('Only printable ASCII characters are supported by Basic auth.');
  }
  if (username.includes(':')) {
    hints.push('Username cannot contain ":" — it separates user and password.');
  }
  return hints;
}

/** Generate a random password of the requested length. */
export function randomPassword(length = 20): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}';
  const bytes = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 0xffffffff);
  }
  let out = '';
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    out += alphabet[byte % alphabet.length] ?? 'a';
  }
  return out;
}

export interface Snippets {
  headerValue: string;
  curl: string;
  fetch: string;
  axios: string;
  urlCredential: string;
}

/** Build ready-to-paste code snippets for the generated header. */
export function buildSnippets(username: string, password: string, host: string): Snippets | null {
  const header = authHeaderValue(username, password);
  if (!header) return null;
  const safeHost = host.trim() || 'https://example.com';
  const urlCred = `${urlEncodeCredential(username)}:${urlEncodeCredential(password)}@`;
  return {
    headerValue: header,
    curl: `curl -H "Authorization: ${header}" ${safeHost}`,
    fetch: `fetch('${safeHost}', {\n  headers: { Authorization: '${header}' },\n});`,
    axios: `axios.get('${safeHost}', {\n  headers: { Authorization: '${header}' },\n});`,
    urlCredential: safeHost.replace(/^(https?:\/\/)/, `$1${urlCred}`),
  };
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  if (state.view === 'encode') {
    const header = authHeaderValue(state.username, state.password);
    return header ? `Encode: ${header}` : 'Encode: enter username and password';
  }
  const decoded = decodeBasicHeader(state.decodeInput);
  return decoded ? `Decode: ${decoded.username}:••••••` : 'Decode: paste a valid Basic header';
}

/** One line per step for the active view. */
export function stepsFor(state: ToolState): string[] {
  if (state.view === 'encode') {
    const header = authHeaderValue(state.username, state.password);
    if (!header) return ['Enter a username and password to see the steps.'];
    return [
      'Formula: header = "Basic " + base64(username + ":" + password)',
      `Substitute: base64("${state.username}:${state.password}")`,
      `Compute: ${header}`,
    ];
  }
  const decoded = decodeBasicHeader(state.decodeInput);
  if (!decoded) return ['Paste a valid Basic header to see the steps.'];
  return [
    'Formula: base64(token) -> "username:password"',
    `Split at the first ":"`,
    `Compute: username "${decoded.username}", password hidden`,
  ];
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState): string {
  return summaryText(state);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.view === 'string' && typeof v.username === 'string' && DEFAULT_STATE !== undefined
  );
}

export { VIEWS as MODES };
