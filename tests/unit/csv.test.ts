import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCsv, writeCsv, csvRowsToXlsx } from '../../src/core/csv';
import { parseXlsx } from '../../src/core/xlsx';
import { key } from '../../src/core/keys';

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

describe('csv parser and converter', () => {
  it('parses sample.csv (UTF-8 with BOM, comma delimiter)', () => {
    const buf = toArrayBuffer(readFileSync('tests/fixtures/sample.csv'));
    const { rows, delimiter, encoding } = parseCsv(buf);
    expect(encoding).toBe('utf-8');
    expect(delimiter).toBe(',');
    expect(rows[1][1]).toBe('ภาคเหนือ');
    // Leading zero preserved
    expect(rows[1][2]).toBe('0812345678');
    // Multiline field intact
    expect(rows[1][4]).toBe('First line,\r\nsecond line with comma');
  });

  it('parses nobom.csv (UTF-8 without BOM, semicolon delimiter)', () => {
    const buf = toArrayBuffer(readFileSync('tests/fixtures/nobom.csv'));
    const { rows, delimiter, encoding } = parseCsv(buf);
    expect(encoding).toBe('utf-8');
    expect(delimiter).toBe(';');
    expect(rows[1][1]).toBe('ภาคเหนือ');
    expect(rows[1][2]).toBe('0812345678');
  });

  it('parses tab.tsv.csv (tab delimiter)', () => {
    const buf = toArrayBuffer(readFileSync('tests/fixtures/tab.tsv.csv'));
    const { rows, delimiter } = parseCsv(buf);
    expect(delimiter).toBe('\t');
    expect(rows[1][1]).toBe('ภาคเหนือ');
  });

  it('parses thai-874.csv (Windows-874 encoding)', () => {
    const buf = toArrayBuffer(readFileSync('tests/fixtures/thai-874.csv'));
    const { rows, delimiter, encoding } = parseCsv(buf);
    expect(encoding).toBe('windows-874');
    expect(delimiter).toBe(',');
    expect(rows[1][1]).toBe('ภาคเหนือ');
    expect(rows[2][1]).toBe('สมชาย');
  });

  it('round-trips writeCsv and parseCsv', () => {
    const original = [
      ['id', 'name', 'phone'],
      ['1', 'ภาคเหนือ', '0812345678'],
      ['2', 'Somchai, with comma', '0899999999'],
    ];
    const written = writeCsv(original, ',');
    const parsed = parseCsv(written);
    expect(parsed.rows).toEqual(original);
  });

  it('converts csvRowsToXlsx preserving values and strings with leading zeros', async () => {
    const original = [
      ['id', 'name', 'phone', 'amount'],
      ['1', 'ภาคเหนือ', '0812345678', '1500'],
    ];
    const xlsxBuf = await csvRowsToXlsx(original, true);
    const { sheets } = await parseXlsx(xlsxBuf);
    const sheet = sheets[0];

    // Phone cell at row 1, col 2 should be string '0812345678'
    const phoneCell = sheet.cells.get(key(1, 2));
    expect(phoneCell?.v).toBe('0812345678');
    expect(typeof phoneCell?.v).toBe('string');

    // Amount cell at row 1, col 3 should be number 1500
    const amtCell = sheet.cells.get(key(1, 3));
    expect(amtCell?.v).toBe(1500);

    // Header frozen
    expect(sheet.frozen.rows).toBe(1);
  });
});
