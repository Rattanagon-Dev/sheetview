import { describe, it, expect } from 'vitest';
import { resolveColor, parseThemeXml } from '../../src/core/colors';

describe('colors', () => {
  it('resolves argb color', () => {
    expect(resolveColor({ argb: 'FFFF0000' })).toBe('#FF0000');
  });

  it('resolves theme color with default theme', () => {
    expect(resolveColor({ theme: 4 })).toBe('#4472C4');
  });

  it('handles tint (theme 4 with tint 0.4 increases lightness)', () => {
    const base = resolveColor({ theme: 4 });
    const tinted = resolveColor({ theme: 4, tint: 0.4 });
    expect(base).toBe('#4472C4');
    expect(tinted).toBeDefined();
    // In HSL, positive tint increases lightness, making it closer to white (larger RGB components)
    const baseR = parseInt(base!.slice(1, 3), 16);
    const tintedR = parseInt(tinted!.slice(1, 3), 16);
    expect(tintedR).toBeGreaterThan(baseR);
  });

  it('resolves indexed colors', () => {
    expect(resolveColor({ indexed: 10 })).toBe('#FF0000');
    expect(resolveColor({ indexed: 64 })).toBeUndefined();
    expect(resolveColor({ indexed: 65 })).toBeUndefined();
  });

  it('parses theme xml with srgbClr and sysClr lastClr', () => {
    const xml = `
      <a:themeElements xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:clrScheme name="Office">
          <a:dk1><a:sysClr val="windowText" lastClr="112233"/></a:dk1>
          <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
          <a:dk2><a:srgbClr val="44546A"/></a:dk2>
          <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
          <a:accent1><a:srgbClr val="AABBCC"/></a:accent1>
        </a:clrScheme>
      </a:themeElements>
    `;
    const theme = parseThemeXml(xml);
    // order: lt1, dk1, lt2, dk2, accent1...
    expect(theme[0]).toBe('FFFFFF');
    expect(theme[1]).toBe('112233');
    expect(theme[4]).toBe('AABBCC');
  });
});
