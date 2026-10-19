// Rebuild distributable SVGs from the same geometry used by React Native.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/components/brand/wordmarkGeometry.ts'), 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const { WORDMARK_GLYPHS, WORDMARK_WIDTH, WORDMARK_HEIGHT, WORDMARK_TRANSFORM } = exportsObject;
const variants = [
  ['fitnyx-wordmark.svg', '#14251B', '#316844'],
  ['fitnyx-wordmark-light.svg', '#F4F5EA', '#5FC793'],
  ['fitnyx-wordmark-mono.svg', 'currentColor', 'currentColor'],
];
for (const [name, ink, accent] of variants) {
  const glyphs = WORDMARK_GLYPHS.map(g => `    <g transform="translate(${g.x} 0)"><path d="${g.path}" fill="${ink}"/>${g.accentPath ? `<path d="${g.accentPath}" fill="${accent}"/>` : ''}</g>`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WORDMARK_WIDTH}" height="${WORDMARK_HEIGHT}" viewBox="0 0 ${WORDMARK_WIDTH} ${WORDMARK_HEIGHT}" role="img" aria-label="FitNyx">\n  <g transform="${WORDMARK_TRANSFORM}">\n${glyphs}\n  </g>\n</svg>\n`;
  fs.writeFileSync(path.join(root, 'assets/brand', name), svg);
}
