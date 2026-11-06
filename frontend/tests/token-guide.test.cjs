const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/TokenGuide.tsx'), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS,target: ts.ScriptTarget.ES2022,jsx: ts.JsxEmit.ReactJSX},
}).outputText, {exports: exportsObject,require});
const {TokenGuide} = exportsObject;
test('shows keyword definitions, patterns, and skipped tokens', () => {
  const markup = renderToStaticMarkup(React.createElement(TokenGuide, {keywords:['team','complete'], tokens:[
    {type:'NUMBER',pattern:'[0-9]+',ignored:false}, {type:'COMMENT',pattern:'//[^\\n]*',ignored:true},
  ]}));
  for (const text of ['team','complete','NUMBER','[0-9]+','COMMENT','Skip','Emit']) assert.ok(markup.includes(text));
  assert.match(markup,/scope="col"/);
});
test('renders patterns as escaped text', () => {
  const markup = renderToStaticMarkup(React.createElement(TokenGuide, {keywords:[],tokens:[{type:'TEST',pattern:'<script>',ignored:false}]}));
  assert.doesNotMatch(markup,/<script>/);
  assert.match(markup,/&lt;script&gt;/);
});
