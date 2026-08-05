import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const sourceRoot = join(root, 'src');
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.mjs']);

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(path));
    else output.push(path);
  }
  return output;
}

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

const files = await walk(root);
const importPattern = /(?:from\s+|import\s*\()?["'](@\/[^"']+|\.{1,2}\/[^"']+)["']/g;
const missing = [];
for (const file of files.filter((path) => codeExtensions.has(extname(path)))) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(importPattern)) {
    const specifier = match[1];
    const base = specifier.startsWith('@/')
      ? join(sourceRoot, specifier.slice(2))
      : resolve(dirname(file), specifier);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, join(base, 'index.ts'), join(base, 'index.tsx')];
    if (!(await Promise.all(candidates.map(exists))).some(Boolean)) missing.push(`${relative(root, file)} -> ${specifier}`);
  }
}
if (missing.length) {
  console.error(missing.join('\n'));
  process.exit(1);
}
console.log(`Static audit passed: ${files.length} files; no missing internal imports.`);
