import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist/vendor', { recursive: true });
for (const path of ['src', 'image', 'background.png']) await cp(path, `dist/${path}`, { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await cp(`node_modules/three/build/${file}`, `dist/vendor/${file}`);
await cp('node_modules/three/LICENSE', 'dist/vendor/THREE-LICENSE.txt');
const html = await readFile('index.html', 'utf8');
let foundImportMap = false;
const builtHtml = html.replace(/(<script type="importmap">)([\s\S]*?)(<\/script>)/, (_, open, json, close) => {
  const map = JSON.parse(json);
  if (!map.imports?.three) throw new Error('Missing three import map entry');
  map.imports.three = './vendor/three.module.js';
  foundImportMap = true;
  return open + JSON.stringify(map) + close;
});
if (!foundImportMap) throw new Error('Missing import map in index.html');
await writeFile('dist/index.html', builtHtml);
console.log('Built dist/ — all asset paths are relative for GitHub Pages.');
