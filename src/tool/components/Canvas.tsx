'use client';

import React from 'react';
import {
  authHeaderValue,
  buildSnippets,
  decodeBasicHeader,
  randomPassword,
  validationHints,
  VIEWS,
  type ToolState,
} from '../types';
import { stepsFor, summaryText } from '../tool-definition';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function SnippetRow({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div className="space-y-1" data-testid={testid}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <CopyButton value={value} testid={`${testid}-copy`} />
      </div>
      <pre className="overflow-x-auto rounded-md bg-gray-100 p-2 font-mono text-xs break-all whitespace-pre-wrap dark:bg-gray-900">
        {value}
      </pre>
    </div>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const hints = validationHints(state.username, state.password);
  const header = authHeaderValue(state.username, state.password);
  const snippets = buildSnippets(state.username, state.password, 'https://example.com');
  const decoded = decodeBasicHeader(state.decodeInput);
  const steps = stepsFor(state);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="auth-canvas">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="View mode"
        data-testid="view-tabs"
      >
        {VIEWS.map((view) => (
          <button
            key={view.value}
            type="button"
            role="tab"
            aria-selected={state.view === view.value}
            data-testid={`view-tab-${view.value}`}
            title={view.hint}
            onClick={() => update({ view: view.value })}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              state.view === view.value
                ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {state.view === 'encode' ? (
        <div className="grid gap-4" data-testid="encode-inputs">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Username
            <input
              type="text"
              value={state.username}
              onChange={(e) => update({ username: e.target.value })}
              data-testid="input-username"
              autoComplete="off"
              className={inputClass}
            />
          </label>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Password
            <span className="flex gap-2">
              <input
                type={state.maskPassword ? 'password' : 'text'}
                value={state.password}
                onChange={(e) => update({ password: e.target.value })}
                data-testid="input-password"
                autoComplete="off"
                className={inputClass}
              />
              <button
                type="button"
                data-testid="btn-unmask"
                onClick={() => update({ maskPassword: !state.maskPassword })}
                className="rounded-md border border-gray-300 px-2 text-xs dark:border-gray-700"
                aria-label={state.maskPassword ? 'Show password' : 'Hide password'}
              >
                {state.maskPassword ? 'Show' : 'Hide'}
              </button>
              <button
                type="button"
                data-testid="btn-random-password"
                onClick={() => update({ password: randomPassword(20) })}
                className="rounded-md border border-gray-300 px-2 text-xs dark:border-gray-700"
                aria-label="Generate random password"
              >
                Random
              </button>
            </span>
          </label>
          {hints.length > 0 ? (
            <ul
              className="text-xs text-amber-700 dark:text-amber-300"
              data-testid="validation-hints"
            >
              {hints.map((hint: string) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4" data-testid="decode-inputs">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Paste a Basic header or token
            <textarea
              value={state.decodeInput}
              onChange={(e) => update({ decodeInput: e.target.value })}
              data-testid="input-decode"
              rows={3}
              placeholder="Basic dXNlcm5hbWU6cGFzc3dvcmQ="
              className={`${inputClass} font-mono`}
            />
          </label>
        </div>
      )}

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900"
        data-testid="result-card"
        role="status"
      >
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          {state.view === 'encode' ? 'Authorization header' : 'Decoded credentials'}
        </span>
        {state.view === 'encode' ? (
          header ? (
            <span className="flex items-center justify-center gap-2">
              <span
                className="block font-mono text-sm font-bold break-all"
                data-testid="result-main"
              >
                {header}
              </span>
              <CopyButton value={header} testid="copy-header" />
            </span>
          ) : (
            <span
              className="block font-mono text-3xl font-bold text-gray-400"
              data-testid="result-main"
            >
              —
            </span>
          )
        ) : decoded ? (
          <span className="block space-y-1" data-testid="decode-result">
            <span className="block font-mono text-sm font-bold" data-testid="decoded-username">
              username: {decoded.username}
            </span>
            <span className="block font-mono text-sm font-bold" data-testid="decoded-password">
              password: {decoded.password}
            </span>
          </span>
        ) : (
          <span
            className="block font-mono text-3xl font-bold text-gray-400"
            data-testid="result-main"
          >
            —
          </span>
        )}
        <span
          className="mt-2 block text-xs text-gray-600 dark:text-gray-300"
          data-testid="result-summary"
        >
          {state.view === 'encode' && !header
            ? 'Enter a username and password to generate the header.'
            : state.view === 'decode' && !decoded
              ? 'Paste a valid Basic header to decode it.'
              : 'Copy the result or save it below.'}
        </span>
        {(state.view === 'encode' && header) || (state.view === 'decode' && decoded) ? (
          <button
            type="button"
            data-testid="btn-save-history"
            onClick={() => onSaveHistory?.(summaryText(state))}
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Save to history
          </button>
        ) : null}
      </div>

      {state.view === 'encode' && snippets ? (
        <div
          className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4 dark:border-gray-800 dark:bg-gray-900/50"
          data-testid="snippets"
        >
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Code snippets
          </h3>
          <SnippetRow label="cURL" value={snippets.curl} testid="snippet-curl" />
          <SnippetRow label="fetch()" value={snippets.fetch} testid="snippet-fetch" />
          <SnippetRow label="axios" value={snippets.axios} testid="snippet-axios" />
          <SnippetRow label="URL credentials" value={snippets.urlCredential} testid="snippet-url" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Note: credentials embedded in a URL are not secure; prefer the Authorization header.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          How it works
        </h3>
        <ol className="space-y-1 text-xs text-gray-700 dark:text-gray-300" data-testid="steps-list">
          {steps.map((step, i) => (
            <li key={i} className="font-mono break-all">
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved entries yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300 break-all">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Everything runs locally in your browser; nothing is uploaded. Never share generated
        credentials.
      </p>
    </div>
  );
};
