// Structural checks that catch YAML authoring slips before the build does:
// table rows and comparison rows with the wrong number of cells, and list
// entries that were split on a comma in flow style (a key with a null value).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const root = new URL('../../src/content/', import.meta.url).pathname;
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.yaml') && files.push(join(d, f))));
walk(root);

let problems = 0;
const report = (file, msg) => {
  problems++;
  console.error(`${file.replace(root, 'src/content/')}: ${msg}`);
};

function visit(node, file, path) {
  if (Array.isArray(node)) return node.forEach((n, i) => visit(n, file, `${path}[${i}]`));
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (v === null) report(file, `${path}.${k} is empty (a comma inside a flow-style value?)`);
  }
  if (Array.isArray(node.columns) && Array.isArray(node.rows)) {
    const n = node.columns.length;
    node.rows.forEach((r, i) => {
      const cells = Array.isArray(r) ? r : r.cells;
      const width = Array.isArray(r) ? n : n; // comparison rows have a label plus one cell per column
      if (Array.isArray(cells) && cells.length !== width) report(file, `${path}.rows[${i}] has ${cells.length} cells for ${n} columns`);
    });
  }
  for (const [k, v] of Object.entries(node)) visit(v, file, `${path}.${k}`);
}

for (const f of files) {
  let data;
  try {
    data = parse(readFileSync(f, 'utf8'));
  } catch (e) {
    report(f, `does not parse: ${e.message.split('\n')[0]}`);
    continue;
  }
  visit(data, f, '$');
}
if (problems) {
  console.error(`\n${problems} problem(s) in ${files.length} files`);
  process.exit(1);
}
console.log(`YAML shape: ${files.length} files, no problems`);
