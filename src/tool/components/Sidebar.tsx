'use client';

import React from 'react';
import { VIEWS, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="auth-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Views</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {VIEWS.map((view) => (
            <li key={view.value} className="flex justify-between gap-2">
              <span>{view.label}</span>
              <span className="text-gray-500 dark:text-gray-400">{view.hint}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved entries</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">How Basic auth works</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          The client concatenates <code>username:password</code>, encodes it as Base64 and prefixes
          it with <code>Basic </code>. It is not encryption — always use HTTPS.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Privacy</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          All encoding and decoding happens locally in your browser. Credentials are sent nowhere
          and stored only in your own localStorage.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current state. Caution: a
          shared encode-state URL contains the credentials themselves — only share decoded examples.
        </p>
      </div>
    </div>
  );
};
