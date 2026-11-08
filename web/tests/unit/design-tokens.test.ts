import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards for the Larkspur tokens that no linter sees: contrast in both themes,
// the two copies of the dark palette, reduced motion, unused tokens, and the
// contrast table in docs/reference/design-tokens.md.
const WEB = join(import.meta.dirname, '../..');
const tokensCss = readFileSync(join(WEB, 'packages/ui/src/styles/tokens.css'), 'utf8');
const doc = readFileSync(join(WEB, '../docs/reference/design-tokens.md'), 'utf8');

function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No block for ${selector}`);
  return css.slice(start, css.indexOf('\n}', start));
}

function colours(source: string): Map<string, string> {
  return new Map(
    [...source.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1]!, m[2]!]),
  );
}

const light = colours(block(tokensCss, ':root'));
const dark = colours(block(tokensCss, ":root[data-theme='dark']"));
const systemDark = colours(block(tokensCss, ":root:not([data-theme='light'])"));

/** WCAG 2.x relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

/** The pairs documented in design-tokens.md: `| `fg` on `bg` | use | light | dark | minimum |`. */
const documented = [
  ...doc.matchAll(
    /^\| `([a-z-]+)` on `([a-z-]+)` \| [^|]+\| ([\d.]+):1 \| ([\d.]+):1 \| ([\d.]+):1 \|/gm,
  ),
].map((m) => ({
  fg: m[1]!,
  bg: m[2]!,
  light: Number(m[3]),
  dark: Number(m[4]),
  minimum: Number(m[5]),
}));

describe('design tokens', () => {
  it('defines the dark palette identically for the system setting and the theme switch', () => {
    expect(systemDark.size).toBeGreaterThan(10);
    expect(Object.fromEntries(systemDark)).toEqual(Object.fromEntries(dark));
  });

  it('meets the documented contrast minimum for every pair in both themes, as documented', () => {
    expect(documented.length).toBeGreaterThanOrEqual(20);
    for (const pair of documented) {
      const name = `${pair.fg} on ${pair.bg}`;
      const lightRatio = contrast(light.get(pair.fg)!, light.get(pair.bg)!);
      const darkRatio = contrast(dark.get(pair.fg)!, dark.get(pair.bg)!);
      expect(lightRatio, `${name} (light)`).toBeGreaterThanOrEqual(pair.minimum);
      expect(darkRatio, `${name} (dark)`).toBeGreaterThanOrEqual(pair.minimum);
      expect(lightRatio.toFixed(2), `${name} (light) in the docs`).toBe(pair.light.toFixed(2));
      expect(darkRatio.toFixed(2), `${name} (dark) in the docs`).toBe(pair.dark.toFixed(2));
    }
  });

  it('drops every duration token to 0ms when reduced motion is requested', () => {
    const reduced = block(tokensCss, '@media (prefers-reduced-motion: reduce)');
    const durations = [...tokensCss.matchAll(/^\s*(--duration-[a-z]+):/gm)].map((m) => m[1]!);
    expect(durations.length).toBeGreaterThan(0);
    for (const name of new Set(durations)) expect(reduced).toContain(`${name}: 0ms;`);
  });

  it('has no token that no other style sheet or component uses', () => {
    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== 'dist') walk(path);
        } else if (/\.(css|tsx?)$/.test(entry.name) && entry.name !== 'tokens.css') {
          sources.push(readFileSync(path, 'utf8'));
        }
      }
    };
    walk(join(WEB, 'apps'));
    walk(join(WEB, 'packages/ui/src'));
    const everything = sources.join('\n');
    const defined = new Set([...tokensCss.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]!));
    const unused = [...defined].filter((name) => !everything.includes(`var(${name}`));
    expect(unused).toEqual([]);
  });
});
