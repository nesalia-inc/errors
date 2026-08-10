// Stub for `next/font/google` so the layout module can be imported inside
// Vitest without crashing on the network call it normally performs.
//
// The stub exposes the same surface that the production code uses
// (`Inter({ subsets, display })` returns `{ className, variable, style }`).
// Tests do not assert on the class name itself; they only need the import
// chain to resolve.

interface FontOptions {
  subsets?: string[];
  display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
}

interface FontHandle {
  className: string;
  variable: string;
  style: Record<string, string>;
}

const makeFont =
  (label: string) =>
  (_options: FontOptions = {}): FontHandle => ({
    className: `__vitest_font_${label.toLowerCase()}__`,
    variable: `--vitest-font-${label.toLowerCase()}`,
    style: {},
  });

export const Inter = makeFont('Inter');
export const Geist = makeFont('Geist');
export const Roboto = makeFont('Roboto');
export default { Inter, Geist, Roboto };
