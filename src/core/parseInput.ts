import { CellValue } from './types';

export type ParsedInput = CellValue | { formula: string };

export function parseInput(input: string, kind: 'xlsx' | 'csv'): ParsedInput {
  if (input === '') return null;

  if (kind === 'xlsx') {
    if (input.startsWith('=')) {
      return { formula: input.slice(1) };
    }
    const upper = input.toUpperCase();
    if (upper === 'TRUE') return true;
    if (upper === 'FALSE') return false;

    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const d = new Date(input + 'T00:00:00.000Z');
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Matches /^-?(0|[1-9]\d{0,14})(\.\d+)?$/ → number. Leading zeros like "0812" stay strings.
  if (/^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(input)) {
    const num = Number(input);
    if (!isNaN(num)) return num;
  }

  return input;
}
