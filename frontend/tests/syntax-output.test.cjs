const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/SyntaxOutput.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: exportsObject, require: name => name.endsWith('.css') ? {} : require(name) });

test('shows distinct AST and parse-tree sections with real structures', () => {
  const output = { ast: { type: 'Program', teams: [{id: 'IND'}], innings: [] }, parse_tree: {symbol: 'Program', children: [{symbol: 'ε', children: []}]} };
  const markup = renderToStaticMarkup(React.createElement(exportsObject.SyntaxOutput, { output }));
  assert.match(markup, /Abstract syntax tree/);
  assert.match(markup, /Grammar structure/);
  assert.match(markup, /IND/);
  assert.match(markup, /ε/);
  assert.match(markup, /<details open=""/);
});
test('syntax output escapes source text', () => {
  const output = { ast: {type: 'Program', teams: [{name: '<script>alert(1)</script>'}]}, parse_tree: {symbol: 'Program', children: []} };
  const markup = renderToStaticMarkup(React.createElement(exportsObject.SyntaxOutput, { output }));
  assert.doesNotMatch(markup, /<script>/);
  assert.match(markup, /&lt;script&gt;/);
});
