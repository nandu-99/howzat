const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(name) {
  const exportsObject = {};
  const file = path.join(__dirname, '../src', name);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
  }).outputText, {exports: exportsObject, require: name => name.endsWith('.css') ? {} : name === './optimizationDiff' ? load('optimizationDiff.ts') : require(name)});
  return exportsObject;
}
const { optimizationRows } = load('optimizationDiff.ts');
const { OptimizationOutput } = load('OptimizationOutput.tsx');
const before = 'BEGIN_INNINGS IND\nt1 = 2 + 2\n  EMIT_DELIVERY run, t1\nEND_INNINGS';
const after = 'BEGIN_INNINGS IND\n  EMIT_DELIVERY run, 4\nEND_INNINGS';
test('aligns deleted temporary and substituted delivery without shifting boundaries', () => {
  const rows = optimizationRows(before, after);
  assert.equal(rows.length, 4);
  assert.equal(rows[1].after, undefined);
  assert.equal(rows[2].after, '  EMIT_DELIVERY run, 4');
  assert.equal(rows[3].changed, false);
});
test('comparison shows counts, explanations, and colored changes', () => {
  const markup = renderToStaticMarkup(React.createElement(OptimizationOutput, {output: {
    before, after, changes: ['Folded t1 to 4'], before_count: 4, after_count: 3, instructions: [],
  }}));
  assert.match(markup, /Before optimization/);
  assert.match(markup, /After optimization/);
  assert.match(markup, /1 temporary assignment removed/);
  assert.match(markup, /Folded t1 to 4/);
  assert.match(markup, /optimization-removed/);
  assert.match(markup, /optimization-added/);
});
test('unchanged output uses a single listing and explains why', () => {
  const markup = renderToStaticMarkup(React.createElement(OptimizationOutput, {output: {
    before: after, after, changes: [], before_count: 3, after_count: 3, instructions: [],
  }}));
  assert.match(markup, /Nothing to simplify/);
  assert.equal((markup.match(/<pre/g) || []).length, 1);
  assert.doesNotMatch(markup, /Before optimization/);
});
test('code and explanations are escaped', () => {
  const markup = renderToStaticMarkup(React.createElement(OptimizationOutput, {output: {
    before: '<script>', after: 'done', changes: ['<script>'], before_count: 1, after_count: 1, instructions: [],
  }}));
  assert.doesNotMatch(markup, /<script>/);
  assert.match(markup, /&lt;script&gt;/);
});
