/**
 * Product name and logo files: ONE source. The logo is white on transparent ("on dark") with a
 * navy copy for light backgrounds ("on light"); the mark is the llama alone (small headers, icon).
 * Source file: docs/brand/bridgy-logo-source.png. Favicon: app/icon.png.
 * No server-only imports: safe in client components.
 */
export const BRAND = {
  name: "bridgy",
  logoOnDark: { src: "/brand/bridgy-logo-on-dark.png", width: 900, height: 350 },
  logoOnLight: { src: "/brand/bridgy-logo-on-light.png", width: 900, height: 350 },
  markOnDark: { src: "/brand/bridgy-mark-on-dark.png", width: 256, height: 256 },
  markOnLight: { src: "/brand/bridgy-mark-on-light.png", width: 256, height: 256 },
} as const;
