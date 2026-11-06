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
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, `../src/${name}.tsx`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports: exportsObject, require: name => name.endsWith('.css') ? {} : require(name) });
  return exportsObject[name];
}
test('IR view shows instruction count and formatted code', () => {
  const markup = renderToStaticMarkup(React.createElement(load('IntermediateOutput'), {
    output: {instructions: [{op: 'END_INNINGS'}], code: 'END_INNINGS'},
  }));
  assert.match(markup, /1 instruction/);
  assert.match(markup, /END_INNINGS/);
  assert.match(markup, /Intermediate instructions/);
});
test('target view escapes generated code and displays its purpose', () => {
  const markup = renderToStaticMarkup(React.createElement(load('TargetOutput'), {
    output: {code: 'print("<script>")', scorecard: {innings: []}},
  }));
  assert.match(markup, /Generated Python/);
  assert.match(markup, /&lt;script&gt;/);
  assert.doesNotMatch(markup, /<script>/);
});
