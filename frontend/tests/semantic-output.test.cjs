const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/SemanticOutput.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: exportsObject, require: name => name.endsWith('.css') ? {} : require(name) });
const { SemanticOutput } = exportsObject;
const symbol = {kind: 'team', name: 'India', line: 1, column: 6, end_column: 9};
const check = {team: 'IND', over: 1, delivery: 1, kind: 'run', value: 4, legal: true, status: 'valid', line: 3, column: 23, end_column: 26};
const output = {symbol_table: {IND: symbol}, checks: [check], over_checks: [], innings_checks: [], validated_ast: {type: 'Program', teams: [], innings: []}};

test('renders symbols and evaluated delivery values with source links', () => {
  const markup = renderToStaticMarkup(React.createElement(SemanticOutput, {output, onLocate() {}}));
  assert.match(markup, /Symbol table/);
  assert.match(markup, /India/);
  assert.match(markup, /Delivery checks/);
  assert.match(markup, /Find declaration of IND/);
  assert.match(markup, /Find IND over 1 delivery 1/);
  assert.match(markup, /✓ Valid/);
});
test('source buttons pass original declaration and delivery positions', () => {
  const selected = [];
  const tree = SemanticOutput({output, onLocate: value => selected.push(value)});
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'button') node.props.onClick();
    React.Children.toArray(node.props?.children).forEach(visit);
  }
  visit(tree);
  assert.deepEqual(selected, [symbol, check]);
});
test('escapes display names', () => {
  const markup = renderToStaticMarkup(React.createElement(SemanticOutput, {
    output: {...output, symbol_table: {IND: {...symbol, name: '<script>alert(1)</script>'}}}, onLocate() {},
  }));
  assert.doesNotMatch(markup, /<script>/);
  assert.match(markup, /&lt;script&gt;/);
});

test('renders partial-over checks and confirmed chase completion', () => {
  const markup = renderToStaticMarkup(React.createElement(SemanticOutput, {output: {
    ...output,
    over_checks: [{...check, partial: true, legal_balls: 1, deliveries: 1, wickets_so_far: 0}],
    innings_checks: [{...check, runs: 4, wickets: 0, target: 2, complete: true, completion_reason: 'target_reached'}],
  }, onLocate() {}}));
  assert.match(markup, /Over checks/);
  assert.match(markup, /Partial/);
  assert.match(markup, /Innings checks/);
  assert.match(markup, /Target reached/);
  assert.match(markup, /Find innings IND/);
  assert.match(markup, /Legal ball/);
});
test('over and innings source links preserve their locations', () => {
  const over = {...check, partial: true, legal_balls: 1, deliveries: 1, wickets_so_far: 0};
  const innings = {...check, runs: 4, wickets: 0, target: null, complete: false, completion_reason: null};
  const selected = [];
  const tree = SemanticOutput({output: {...output, over_checks: [over], innings_checks: [innings]}, onLocate: value => selected.push(value)});
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'button') node.props.onClick();
    React.Children.toArray(node.props?.children).forEach(visit);
  }
  visit(tree);
  assert.deepEqual(selected, [symbol, over, innings, check]);
});
