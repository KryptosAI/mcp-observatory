import {cp, mkdir, copyFile} from 'node:fs/promises';
const source = new URL('../hosting/src/ui/', import.meta.url);
const target = new URL('../dist/hosting/src/ui/', import.meta.url);
await mkdir(target, {recursive:true});
await cp(new URL('fonts/', source), new URL('fonts/', target), {recursive:true});
for (const file of ['Inter-OFL.txt', 'JetBrainsMono-OFL.txt', 'SOURCE.md']) {
  await copyFile(new URL(file, source), new URL(file, target));
}
