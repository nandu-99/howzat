const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/syntaxTrees.ts');
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { astToTree, cfgExampleFromTree, buildTokenPath, collectDeliveries } = loaded.exports;
const node = (symbol, ...children) => ({ symbol, children });
const constant = value => ({ type: 'Constant', value });

test('AST rendering preserves team, innings, over, and delivery hierarchy', () => {
  const ast = { type: 'Program', teams: [{ type: 'Team', id: 'IND', name: 'India' }], innings: [
    { type: 'Innings', team: 'IND', overs: [{ type: 'Over', number: 2, partial: true,
      deliveries: [{ type: 'Delivery', kind: 'wicket', value: constant(0) }] }] },
  ] };
  const tree = astToTree(ast);
  assert.equal(tree.symbol, 'Program');
  assert.equal(tree.children[0].symbol, 'Team IND');
  assert.equal(tree.children[0].children[0].symbol, 'Name: India');
  assert.deepEqual(tree.children[1], node('Innings IND', node('Over 2 (partial)', node('Delivery: wicket', node('Number: 0')))));
});

test('AST rendering retains nested arithmetic and operand order', () => {
  const ast = { type: 'Binary', op: '+', left: constant(1), right: { type: 'Binary', op: '*', left: constant(2), right: constant(3) } };
  const tree = astToTree(ast);
  assert.equal(tree.symbol, 'Binary +');
  assert.deepEqual(tree.children[0], node('Left', node('Number: 1')));
  assert.equal(tree.children[1].children[0].symbol, 'Binary *');
  assert.equal(tree.children[1].children[0].children[1].children[0].symbol, 'Number: 3');
});

test('AST shows an explicitly completed innings', () => {
  const tree = astToTree({ type: 'Innings', team: 'IND', complete: true, overs: [] });
  assert.equal(tree.symbol, 'Innings IND (complete)');
});

test('CFG example follows the actual first delivery instead of a fixed sample', () => {
  const tree = node('Program', node('Team', node('IND')), node('Over',
    node('Delivery', node('Number', node('4'))), node('Delivery', node('wide'))));
  const example = cfgExampleFromTree(tree);
  assert.equal(example.source, '4');
  assert.deepEqual(example.rules, ['Delivery → Number', 'Number → NUMBER']);
  assert.deepEqual(example.derivation, ['Delivery', 'Number', 'NUMBER']);
  assert.equal(cfgExampleFromTree(node('Delivery', node('wide'))).source, 'wide');
  assert.equal(cfgExampleFromTree(node('Delivery', node('wide'))).derivation.at(-1), 'wide');
});

test('CFG expression example includes empty productions but not empty source tokens', () => {
  const tree = node('Delivery', node('run'), node('('), node('Expr',
    node('Term', node('Factor', node('Number', node('2'))), node('TermTail', node('ε'))),
    node('ExprTail', node('+'), node('Term', node('Factor', node('Number', node('2'))), node('TermTail', node('ε'))), node('ExprTail', node('ε')))), node(')'));
  const example = cfgExampleFromTree(tree);
  assert.equal(example.source, 'run ( 2 + 2 )');
  assert.ok(example.rules.includes('ExprTail → ε'));
  assert.equal(example.derivation.at(-1), 'run ( NUMBER + NUMBER )');
  assert.ok(!example.derivation.at(-1).includes('ε'));
  assert.equal(example.truncated, false);
});

test('token diagram has a single initial state, a single final state, and ordered labeled transitions', () => {
  const tokens = ['run', '(', '2', '+', '2', ')'];
  const path = buildTokenPath(tokens);
  assert.equal(path.states.length, tokens.length + 1);
  assert.equal(path.states.filter(state => state.initial).length, 1);
  assert.equal(path.states.filter(state => state.accepting).length, 1);
  assert.equal(path.states[0].id, 'q0');
  assert.equal(path.states.at(-1).accepting, true);
  assert.deepEqual(path.transitions.map(edge => edge.label), tokens);
  path.transitions.forEach((edge, index) => {
    assert.equal(edge.source, `q${index}`);
    assert.equal(edge.target, `q${index + 1}`);
  });
  assert.equal(path.transitions[3].sourceHandle, 'source-bottom');
  assert.equal(path.transitions[3].targetHandle, 'target-top');
  assert.equal(path.transitions[4].sourceHandle, 'source-left');
  assert.equal(path.transitions[4].targetHandle, 'target-right');
});

test('one delivery token reaches the final state in exactly one transition', () => {
  const path = buildTokenPath(['wide']);
  assert.equal(path.states.length, 2);
  assert.deepEqual(path.transitions.map(({ source, target, label }) => ({ source, target, label })), [{ source: 'q0', target: 'q1', label: 'wide' }]);
});

test('all deliveries can be selected in original order across overs and innings', () => {
  const tree = node('Program', node('Innings', node('Over', node('Delivery', node('Number', node('0'))), node('Delivery', node('wicket')))),
    node('Innings', node('Over', node('Delivery', node('wide')))));
  const deliveries = collectDeliveries(tree);
  assert.deepEqual(deliveries.map(item => item.source), ['0', 'wicket', 'wide']);
  assert.equal(cfgExampleFromTree(deliveries[1].tree).source, 'wicket');
  assert.equal(cfgExampleFromTree(deliveries[2].tree).source, 'wide');
});
