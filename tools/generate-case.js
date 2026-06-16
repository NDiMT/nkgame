// Case generator: Claude writes the mystery, the image provider draws it.
//
//   1. Claude (claude-opus-4-8) produces a complete, internally-consistent
//      coop-detective case as structured JSON — including an image prompt for
//      each suspect and clue.
//   2. The configured image provider (Gemini by default) renders each prompt
//      to a file under public/cases/img/<caseId>/.
//   3. The final case JSON (with local image paths) is written to
//      public/cases/<caseId>.json, ready for the game to load.
//
// Usage:
//   ANTHROPIC_API_KEY=... GEMINI_API_KEY=... node tools/generate-case.js [theme]
//
// Set IMAGE_PROVIDER=placeholder to run the whole pipeline with no image API.

import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PlaceholderProvider } from './providers/image-provider.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CASES_DIR = path.join(ROOT, 'public', 'cases');

// --- tiny .env loader (no dependency) ---------------------------------------
async function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const text = await readFile(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// --- JSON schema we ask Claude to fill --------------------------------------
const CASE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    intro: { type: 'string' },
    art_style: { type: 'string', description: 'A consistent visual style applied to every image prompt' },
    suspects: { type: 'array', items: namedItem() },
    weapons: { type: 'array', items: namedItem() },
    motives: { type: 'array', items: namedItem() },
    clues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          forPlayer: { type: 'integer', enum: [1, 2] },
          text: { type: 'string' },
          image_prompt: { type: 'string' },
        },
        required: ['id', 'forPlayer', 'text', 'image_prompt'],
      },
    },
    solution: {
      type: 'object',
      additionalProperties: false,
      properties: { suspect: { type: 'string' }, weapon: { type: 'string' }, motive: { type: 'string' } },
      required: ['suspect', 'weapon', 'motive'],
    },
  },
  required: ['title', 'intro', 'art_style', 'suspects', 'weapons', 'motives', 'clues', 'solution'],
};

function namedItem() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      image_prompt: { type: 'string' },
    },
    required: ['id', 'name', 'image_prompt'],
  };
}

const SYSTEM = `You design cooperative detective mysteries for a 2-player game.
Rules:
- Exactly 3 suspects (ids s1,s2,s3), 3 weapons (w1,w2,w3), 3 motives (m1,m2,m3).
- Exactly 6 clues, ids c1..c6, three with forPlayer:1 and three with forPlayer:2.
- ASYMMETRIC: neither player's 3 clues alone identify all of suspect+weapon+motive.
  Only by COMBINING both sets can the pair deduce a single solution. Make sure the
  combination is logically forced and unambiguous.
- The "solution" must reference existing ids.
- Every image_prompt must be a short visual description that includes the shared art_style,
  suitable for an image generation model. Keep art tasteful (no gore).
- Write all player-facing text (title, intro, names, clue text) in Greek.`;

async function generateCaseJSON(theme) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  const userPrompt = theme
    ? `Create a mystery with this theme/setting: ${theme}`
    : 'Create a fresh mystery with an atmospheric setting of your choice.';

  const res = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
    output_config: { format: { type: 'json_schema', schema: CASE_SCHEMA } },
  });

  const text = res.content.find((b) => b.type === 'text')?.text ?? '';
  return JSON.parse(text);
}

function pickProvider() {
  const which = (process.env.IMAGE_PROVIDER || 'placeholder').toLowerCase();
  if (which === 'gemini') {
    // Lazy import so a missing dep doesn't break placeholder runs.
    return import('./providers/image-gemini.js').then(
      ({ GeminiProvider }) => new GeminiProvider(process.env.GEMINI_API_KEY)
    );
  }
  return new PlaceholderProvider();
}

async function main() {
  await loadEnv();
  const theme = process.argv.slice(2).join(' ').trim() || null;

  console.log('→ Generating case with Claude...');
  const data = await generateCaseJSON(theme);

  const caseId = 'case-' + Date.now().toString(36);
  const imgDir = path.join(CASES_DIR, 'img', caseId);
  await mkdir(imgDir, { recursive: true });

  const provider = await pickProvider();
  const ext = provider.extension();
  const style = data.art_style;

  // Render every image prompt; rewrite image_prompt -> local image path.
  const renderTargets = [
    ...data.suspects.map((s) => ({ obj: s, name: s.id })),
    ...data.clues.map((c) => ({ obj: c, name: c.id })),
  ];

  for (const { obj, name } of renderTargets) {
    const prompt = `${obj.image_prompt}. Style: ${style}`;
    const file = `${name}.${ext}`;
    const outPath = path.join(imgDir, file);
    process.stdout.write(`→ image ${name} ... `);
    try {
      await provider.generate(prompt, outPath);
      obj.image = `/cases/img/${caseId}/${name}.${ext}`;
      console.log('ok');
    } catch (e) {
      obj.image = null;
      console.log('skipped (' + e.message + ')');
    }
    delete obj.image_prompt;
  }

  // weapons/motives stay text-only here; add image generation if desired.
  for (const it of [...data.weapons, ...data.motives]) delete it.image_prompt;
  delete data.art_style;
  data.id = caseId;

  const outFile = path.join(CASES_DIR, `${caseId}.json`);
  await writeFile(outFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✓ Wrote ${path.relative(ROOT, outFile)}`);
  console.log('  To use it as the default case, point loadCase() in public/js/game.js at this file.');
}

main().catch((e) => {
  console.error('Generation failed:', e.message);
  process.exit(1);
});
