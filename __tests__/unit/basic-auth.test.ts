import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  encodeBase64,
  decodeBase64,
  authHeaderValue,
  decodeBasicHeader,
  urlEncodeCredential,
  validationHints,
  randomPassword,
  buildSnippets,
  summaryText,
  stepsFor,
  historyText,
  type ToolState,
} from '@/tool/types';
import { serializeState, deserializeState, withHistory, roundTrips } from '@/tool/tool-definition';
import { basicAuthHeaderGeneratorTool } from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('encodeBase64 / decodeBase64', () => {
  it('encodes known values', () => {
    expect(encodeBase64('user:pass')).toBe('dXNlcjpwYXNz');
    expect(encodeBase64('')).toBe('');
    expect(decodeBase64('dXNlcjpwYXNz')).toBe('user:pass');
  });

  it('round-trips unicode', () => {
    const value = 'ünser:Pässwörd✓';
    expect(decodeBase64(encodeBase64(value))).toBe(value);
  });
});

describe('authHeaderValue', () => {
  it('builds the full Basic header for known credentials', () => {
    expect(authHeaderValue('user', 'pass')).toBe('Basic dXNlcjpwYXNz');
  });

  it('returns null for empty username or password', () => {
    expect(authHeaderValue('', 'pass')).toBeNull();
    expect(authHeaderValue('user', '')).toBeNull();
  });

  it('supports passwords containing colons', () => {
    expect(authHeaderValue('user', 'pa:ss')).toBe('Basic ' + encodeBase64('user:pa:ss'));
  });
});

describe('decodeBasicHeader', () => {
  it('decodes a full header line', () => {
    expect(decodeBasicHeader('Basic dXNlcjpwYXNz')).toEqual({ username: 'user', password: 'pass' });
  });

  it('decodes a bare token and is case-insensitive on the prefix', () => {
    expect(decodeBasicHeader('dXNlcjpwYXNz')).toEqual({ username: 'user', password: 'pass' });
    expect(decodeBasicHeader('basic dXNlcjpwYXNz')).toEqual({ username: 'user', password: 'pass' });
  });

  it('round-trips a generated header', () => {
    const header = authHeaderValue('alice', 's3cret!');
    const decoded = decodeBasicHeader(header as string);
    expect(decoded).toEqual({ username: 'alice', password: 's3cret!' });
  });

  it('rejects invalid input', () => {
    expect(decodeBasicHeader('')).toBeNull();
    expect(decodeBasicHeader('not base64!!')).toBeNull();
    expect(decodeBasicHeader(encodeBase64('no-colon-here'))).toBeNull();
  });

  it('splits at the first colon only', () => {
    expect(decodeBasicHeader(encodeBase64('user:p:ass'))).toEqual({
      username: 'user',
      password: 'p:ass',
    });
  });
});

describe('urlEncodeCredential', () => {
  it('escapes special characters for URL credentials', () => {
    expect(urlEncodeCredential('user@x')).toBe('user%40x');
    expect(urlEncodeCredential('pa:ss/wd')).toBe('pa%3Ass%2Fwd');
  });
});

describe('validationHints', () => {
  it('requires username and password', () => {
    const hints = validationHints('', '');
    expect(hints.some((h) => /username/i.test(h))).toBe(true);
    expect(hints.some((h) => /password/i.test(h))).toBe(true);
  });

  it('flags a colon in the username', () => {
    expect(
      validationHints('us:er', 'pass').some((h) => /separates user and password/i.test(h))
    ).toBe(true);
  });

  it('returns no hints for a valid pair', () => {
    expect(validationHints('user', 'pass')).toEqual([]);
  });
});

describe('randomPassword', () => {
  it('generates the requested length', () => {
    expect(randomPassword(16)).toHaveLength(16);
    expect(randomPassword(32)).toHaveLength(32);
  });

  it('generates different passwords between calls', () => {
    const seen = new Set(Array.from({ length: 8 }, () => randomPassword(20)));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('buildSnippets', () => {
  it('builds curl, fetch and axios snippets containing the header', () => {
    const snippets = buildSnippets('user', 'pass', 'https://api.example.com');
    expect(snippets).not.toBeNull();
    const header = 'Basic dXNlcjpwYXNz';
    expect(snippets?.headerValue).toBe(header);
    expect(snippets?.curl).toContain(header);
    expect(snippets?.curl).toContain('https://api.example.com');
    expect(snippets?.fetch).toContain(header);
    expect(snippets?.axios).toContain(header);
    expect(snippets?.urlCredential).toBe('https://user:pass@api.example.com');
  });

  it('returns null without credentials', () => {
    expect(buildSnippets('', '', 'https://x')).toBeNull();
  });
});

describe('summaryText / stepsFor / historyText', () => {
  it('summarizes encode and decode views', () => {
    expect(summaryText(state())).toContain('Encode');
    expect(summaryText(state({ view: 'decode' }))).toContain('Decode: paste');
    expect(summaryText(state({ view: 'decode', decodeInput: 'Basic dXNlcjpwYXNz' }))).toContain(
      'Decode: user'
    );
  });

  it('builds step lists', () => {
    expect(stepsFor(state())).toHaveLength(1);
    const full = state({ username: 'user', password: 'pass' });
    expect(stepsFor(full)).toHaveLength(3);
    expect(stepsFor(full)[2]).toBe('Compute: Basic dXNlcjpwYXNz');
  });

  it('historyText mirrors summaryText', () => {
    expect(historyText(state({ username: 'u', password: 'p' }))).toBe(
      summaryText(state({ username: 'u', password: 'p' }))
    );
  });
});

describe('serialize / deserialize', () => {
  it('serializes all fields', () => {
    const full = state({
      view: 'decode',
      username: 'user',
      password: 'pass',
      maskPassword: false,
      decodeInput: 'Basic dXNlcjpwYXNz',
    });
    const raw = serializeState(full);
    expect(raw).toContain('"view":"decode"');
    expect(JSON.parse(raw)).toEqual(full);
  });

  it('deserializes valid state', () => {
    const result = deserializeState(JSON.parse(serializeState(state({ username: 'u' }))));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.username).toBe('u');
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1]).success).toBe(false);
  });

  it('repairs invalid fields with defaults', () => {
    const result = deserializeState({ nope: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.view).toBe(DEFAULT_STATE.view);
      expect(result.data.history).toEqual([]);
    }
  });

  it('caps history at MAX_HISTORY and drops invalid entries', () => {
    const entries = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({
      text: `t${i}`,
      createdAt: '2026-01-01T00:00:00.000Z',
    }));
    const result = deserializeState({ ...DEFAULT_STATE, history: [...entries, 'bad'] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.history).toHaveLength(MAX_HISTORY);
  });

  it('round-trips arbitrary states', () => {
    expect(
      roundTrips(
        state({
          view: 'decode',
          username: 'u',
          password: 'p',
          history: [{ text: 'x', createdAt: '2026-01-01T00:00:00.000Z' }],
        })
      )
    ).toBe(true);
  });
});

describe('withHistory and the tool object', () => {
  it('appends history newest first, capped', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 3; i++) s = withHistory(s, `t${i}`);
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe(`t${MAX_HISTORY + 2}`);
    expect(s.history[MAX_HISTORY - 1]?.text).toBe(`t${3}`);
  });

  it('exposes the configured tool', async () => {
    expect(basicAuthHeaderGeneratorTool.id).toBe('basic-auth-header-generator');
    expect(basicAuthHeaderGeneratorTool.name).toBe('Basic Auth Header Generator');
    expect(basicAuthHeaderGeneratorTool.version).toBe('1.0.0');
    expect(basicAuthHeaderGeneratorTool.serialize).toBe(serializeState);
    expect(basicAuthHeaderGeneratorTool.deserialize).toBe(deserializeState);
    const resolvedState = basicAuthHeaderGeneratorTool.deserialize({
      ...DEFAULT_STATE,
      username: 'u',
    });
    expect(resolvedState.success).toBe(true);
    if (resolvedState.success) expect(resolvedState.data.username).toBe('u');
    const exporters = basicAuthHeaderGeneratorTool.exporters ?? [];
    expect(exporters).toHaveLength(4);
    const png = await (exporters[0]?.loader as () => Promise<{ default: { format: string } }>)();
    const resolved = 'default' in png ? png.default : (png as unknown as { format: string });
    expect(resolved.format).toBe('png');
  });
});
