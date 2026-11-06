import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
// A remoção fica restrita à pasta dist do projeto.
if (relative(root, output) !== 'dist') throw new Error('Diretório de saída inválido.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, 'index.html'), resolve(output, 'index.html'));
await cp(resolve(root, 'src'), resolve(output, 'src'), { recursive: true });
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (/\.(php|phar)$/i.test(entry.name)) throw new Error(`Arquivo privado na publicação: ${relative(root, path).split(sep).join('/')}`);
  }
}
await check(output);
console.log('Build concluído: dist contém apenas index.html e src/.');
