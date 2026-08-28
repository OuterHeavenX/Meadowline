// Static hygiene checks that run without a browser:
//   1. no module assigns to an imported binding (throws in strict mode)
//   2. no pure re-export shim modules (main.js is the entry point, exempt)
//   3. no import cycles
//   4. no static import from an off-origin URL
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = globSync('src/**/*.js', { cwd: ROOT }).map(f=>f.replace(/\\/g,'/')).sort();
let failures = 0;
const fail = (msg) => { console.log('  FAIL  ' + msg); failures++; };
const pass = (msg) => console.log('  PASS  ' + msg);

const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');
// comments and string bodies must not be scanned for code patterns: a comment
// rule like `---------` reads as a decrement otherwise
const stripComments = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/[^\n]*/g, ' ')
  .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
const importsOf = (t) => [...t.matchAll(/import\s*(?:\{([^}]*)\}\s*from\s*)?'([^']+)'/g)]
  .map((m) => ({ names: (m[1] || '').split(',').map((s) => s.trim().split(' as ').pop().trim()).filter(Boolean), from: m[2] }));

// 1. assignment to imported bindings
let assignBad = 0;
for (const f of files) {
  const t = read(f);
  const names = new Set(importsOf(t).flatMap((i) => i.names));
  const body = stripComments(t.replace(/^import\s.*?;\s*$/gm, ''));
  for (const n of names) {
    const re = new RegExp('(?<![.\\w])' + n.replace(/[$]/g, '\\$') + '\\s*(?:=[^=]|\\+\\+|--|[-+*/]=)');
    if (re.test(body)) { fail(`${f} assigns to imported binding "${n}"`); assignBad++; }
  }
}
if (!assignBad) pass('no module assigns to an imported binding');

// 2. re-export shims
const shims = files.filter((f) => f !== 'src/main.js' &&
  read(f).split('\n').filter((l) => l.trim() && !/^\s*(\/\/|import\s|export\s*\{[^}]*\}\s*from)/.test(l)).length === 0);
shims.length ? shims.forEach((s) => fail(`${s} is a pure re-export shim`)) : pass('no re-export shim modules');

// 3. cycles
const graph = new Map();
for (const f of files) {
  graph.set(f, importsOf(read(f))
    .map((i) => i.from).filter((p) => p.startsWith('.'))
    .map((p) => path.normalize(path.join(path.dirname(f), p)).replace(/\\/g, '/')));
}
const cycles = [];
const seen = new Map();
(function walk() {
  const visit = (n, stack) => {
    if (stack.includes(n)) { cycles.push([...stack.slice(stack.indexOf(n)), n].join(' -> ')); return; }
    if (seen.get(n)) return;
    seen.set(n, true);
    for (const d of graph.get(n) || []) visit(d, [...stack, n]);
  };
  for (const f of files) visit(f, []);
})();
cycles.length ? cycles.forEach((c) => fail('import cycle: ' + c)) : pass('no import cycles');

// 4. off-origin static imports
// A static import resolves for the whole module graph before any module runs,
// so one CDN import puts the game loop, renderer and save system behind a
// network request and Meadowline will not start when that host is unreachable.
// Clients that genuinely need the network belong behind a dynamic import().
// A line-comment strip must not treat the "//" inside "https://" as a comment,
// which is exactly the specifier this check exists to catch.
const stripBlockComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<![:'"\w])\/\/[^\n]*/g, ' ');
const staticSpecifiers = (t) => [...stripBlockComments(t)
  .matchAll(/(?:^|[\s;}])import\s(?:[^'"();]*?\sfrom\s)?['"]([^'"]+)['"]/g)].map((m) => m[1]);
let remoteBad = 0;
for (const f of files) {
  for (const spec of staticSpecifiers(read(f))) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(spec) || spec.startsWith('//')) {
      fail(`${f} statically imports off-origin "${spec}" — boot would block on that host`);
      remoteBad++;
    }
  }
}
if (!remoteBad) pass('no static import from an off-origin URL');

console.log(`\n${failures ? failures + ' hygiene failure(s)' : 'module hygiene clean'} across ${files.length} modules`);
process.exit(failures ? 1 : 0);
