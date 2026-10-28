import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const errors = [];
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { await check(file); continue; }
    if (!/\.tsx?$/.test(file) || /\.test\.tsx?$/.test(file) || /setupTests|test-utils/.test(file)) continue;
    const source = await readFile(file, 'utf8');
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const fail = (node, message) => {
      const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree));
      errors.push(`${file}:${line + 1}: ${message}`);
    };
    function visit(node) {
      if (node.kind === ts.SyntaxKind.AnyKeyword) fail(node, 'Use a domain type or narrow unknown instead of any.');
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && /^(querySelector|querySelectorAll)$/.test(node.expression.name.text)) fail(node, 'Pass a React ref instead of querying the application DOM.');
      ts.forEachChild(node, visit);
    }
    visit(tree);
    if (/@ts-ignore|eslint-disable[^\n]*exhaustive-deps/.test(source)) errors.push(`${file}: type/hook-check suppression is forbidden.`);
    if (directory.includes(`${path.sep}utils`) && /from ['"](?:node:)?(?:fs|path|react)['"]/.test(source)) errors.push(`${file}: utils must remain pure.`);
  }
}
await check('src');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Production TypeScript standards passed (any, DOM queries, suppressions, utility imports).');
