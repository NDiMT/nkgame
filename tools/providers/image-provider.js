// Image provider interface + a no-API placeholder implementation.
//
// An image provider exposes:
//   async generate(prompt: string, outPath: string) -> void
// It writes a PNG/JPEG/SVG to outPath. The generator script calls it once per
// image prompt produced by Claude. Swapping providers (Gemini, FLUX, OpenAI…)
// means swapping this module — the rest of the generator is provider-agnostic.

import { writeFile } from 'node:fs/promises';

// Deterministic, dependency-free placeholder: a labelled SVG card. Useful for
// running the whole pipeline (and the game) before wiring a real image API.
export class PlaceholderProvider {
  async generate(prompt, outPath) {
    const label = prompt.slice(0, 60).replace(/[<&>]/g, '');
    const hue = [...prompt].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="hsl(${hue} 30% 18%)"/>
  <rect x="20" y="20" width="760" height="560" fill="none" stroke="hsl(${hue} 40% 45%)" stroke-width="4"/>
  <text x="400" y="300" fill="hsl(${hue} 30% 80%)" font-family="serif" font-size="26" text-anchor="middle">${label}</text>
  <text x="400" y="340" fill="hsl(${hue} 20% 55%)" font-family="serif" font-size="16" text-anchor="middle">[placeholder art]</text>
</svg>`;
    await writeFile(outPath.replace(/\.(png|jpg|jpeg)$/i, '.svg'), svg, 'utf8');
  }

  extension() {
    return 'svg';
  }
}
