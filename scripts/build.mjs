import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist/vendor', { recursive: true });
for (const path of ['src', 'image', 'background.png']) await cp(path, `dist/${path}`, { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await cp(`node_modules/three/build/${file}`, `dist/vendor/${file}`);
await cp('node_modules/three/LICENSE', 'dist/vendor/THREE-LICENSE.txt');
const html = await readFile('index.html', 'utf8');
await writeFile('dist/index.html', html.replace('./node_modules/three/build/three.module.js', './vendor/three.module.js'));
console.log('Built dist/ — all asset paths are relative for GitHub Pages.');
