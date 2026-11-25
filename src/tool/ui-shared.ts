import { DEFAULT_STATE, type ToolView, type ToolState } from './types';

export const MODES: { value: ToolView; label: string; hint: string }[] = [
  { value: 'encode', label: 'Generate', hint: 'build a Basic header from credentials' },
  { value: 'decode', label: 'Decode', hint: 'reveal the credentials inside a Basic header' },
];

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.view === 'string' && typeof v.username === 'string' && DEFAULT_STATE !== undefined
  );
}
