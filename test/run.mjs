// Runs every test file in this folder (smoke first), so new branches never fight over package.json.
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const dir = new URL('./', import.meta.url).pathname;
const files = readdirSync(dir).filter((f) => f.endsWith('.mjs') && f !== 'run.mjs').sort((a, b) => (a === 'smoke.mjs' ? -1 : b === 'smoke.mjs' ? 1 : a.localeCompare(b)));
for (const f of files) {
  console.log(`# ${f}`);
  execFileSync(process.execPath, [dir + f], { stdio: 'inherit' });
}
console.log(`all ${files.length} test files passed`);
