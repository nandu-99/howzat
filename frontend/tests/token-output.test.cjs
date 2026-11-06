const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const exportsObject = {};
const source = fs.readFileSync(path.join(__dirname, '../src/TokenOutput.tsx'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText, { exports: exportsObject, require: name => name.endsWith('.css') ? {} : require(name) });
const { TokenOutput } = exportsObject;
const token = (type, lexeme, column = 1) => ({type, lexeme, line: 1, column});

test('renders token types, text, coordinates and EOF without counting EOF', () => {
  const markup = renderToStaticMarkup(React.createElement(TokenOutput, {
    tokens: [token('KEYWORD', 'team'), token('IDENTIFIER', 'IND', 6), token('EOF', 'EOF', 9)], onLocate() {},
  }));
  assert.match(markup, /2 tokens/);
  assert.match(markup, /KEYWORD/);
  assert.match(markup, /End of input/);
  assert.match(markup, /Find IND at line 1, column 6/);
});
test('escapes token values instead of rendering them as HTML', () => {
  const markup = renderToStaticMarkup(React.createElement(TokenOutput, {
    tokens: [token('STRING', '"<script>alert(1)</script>"')], onLocate() {},
  }));
  assert.doesNotMatch(markup, /<script>/);
  assert.match(markup, /&lt;script&gt;/);
});
test('selecting a token passes its original source location', () => {
  const original = token('NUMBER', '4', 13);
  let selected;
  const tree = TokenOutput({ tokens: [original], onLocate: value => { selected = value; } });
  function findButton(node) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'button') return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const button = findButton(child);
      if (button) return button;
    }
    return null;
  }
  const button = findButton(tree);
  assert.ok(button);
  button.props.onClick();
  assert.equal(selected, original);
});
