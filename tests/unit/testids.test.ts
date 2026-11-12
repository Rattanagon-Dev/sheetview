import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function getSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...getSourceFiles(full));
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('data-testid contract verification', () => {
  const requiredTestIds = [
    'open-button',
    'open-input',
    'sample-xlsx',
    'sample-csv',
    'grid',
    'btn-close',
    'btn-undo',
    'btn-search',
    'btn-sortfilter',
    'btn-zoom-in',
    'btn-zoom-out',
    'btn-save',
    'btn-export',
    'btn-settings',
    'btn-more',
    'btn-edit',
    'editor-input',
    'editor-done',
    'search-input',
    'search-next',
    'search-prev',
    'sort-asc',
    'sort-desc',
    'filter-apply',
    'filter-clear',
    'deliver-button',
    'toast',
    'theme-dark',
    'theme-light',
    'theme-system',
  ];

  const sourceFiles = getSourceFiles('src');
  const allSourceText = sourceFiles.map((f) => readFileSync(f, 'utf-8')).join('\n');

  for (const testId of requiredTestIds) {
    it(`contains data-testid="${testId}"`, () => {
      expect(allSourceText).toContain(`data-testid="${testId}"`);
    });
  }

  it('contains dynamic testids cell-{r}-{c} and sheet-tab-{i}', () => {
    expect(allSourceText).toContain('data-testid={`cell-${r}-${c}`}');
    expect(allSourceText).toContain('data-testid={`sheet-tab-${i}`}');
  });
});
