const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Module = require('node:module');
const helperPath = path.resolve(__dirname, '../src/syntaxTrees.ts');
const helper = new Module(helperPath);
helper.filename = helperPath;
helper.paths = Module._nodeModulePaths(path.dirname(helperPath));
helper._compile(ts.transpileModule(fs.readFileSync(helperPath, 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText, helperPath);
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/SyntaxOutput.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: exportsObject, require: name => name.endsWith('.css') ? {} : name === './syntaxTrees' ? helper.exports : name === './ParseTree' ? {
  ParseTree: ({tree, label}) => React.createElement('div', {'aria-label': label}, JSON.stringify(tree)),
} : name === './TokenPathDiagram' ? {TokenPathDiagram: () => null} : require(name) });

test('shows syntax navigation and the actual AST hierarchy', () => {
  const output = { ast: { type: 'Program', teams: [{type: 'Team', id: 'IND', name: 'India'}], innings: [] }, parse_tree: {symbol: 'Program', children: []} };
  const markup = renderToStaticMarkup(React.createElement(exportsObject.SyntaxOutput, {output}));
  assert.match(markup, /Abstract syntax tree/);
  assert.match(markup, /Team IND/);
  assert.match(markup, /role="tablist"/);
  for (const name of ['AST', 'Parse tree', 'CFG rules', 'Token transitions']) assert.ok(markup.includes(name));
  assert.match(markup, /aria-selected="true"/);
});
test('AST labels escape source text', () => {
  const output = { ast: {type: 'Program', teams: [{type: 'Team', id: 'IND', name: '<script>alert(1)</script>'}], innings: []}, parse_tree: {symbol: 'Program', children: []} };
  const markup = renderToStaticMarkup(React.createElement(exportsObject.SyntaxOutput, {output}));
  assert.doesNotMatch(markup, /<script>/);
  assert.match(markup, /&lt;script&gt;/);
});
