import type { ParseTreeNode } from './types';

const branch = (symbol: string, children: ParseTreeNode[] = []): ParseTreeNode => ({ symbol, children });

/** Keep the compiler's semantic hierarchy, rather than displaying JSON fields. */
export function astToTree(value: any): ParseTreeNode {
  switch (value.type) {
    case 'Program':
      return branch('Program', [...value.teams.map(astToTree), ...value.innings.map(astToTree)]);
    case 'Team':
      return branch(`Team ${value.id}`, [branch(`Name: ${value.name}`)]);
    case 'Innings':
      return branch(`Innings ${value.team}${value.complete ? ' (complete)' : ''}`, value.overs.map(astToTree));
    case 'Over':
      return branch(`Over ${value.number}${value.partial ? ' (partial)' : ''}`, value.deliveries.map(astToTree));
    case 'Delivery':
      return branch(`Delivery: ${value.kind}`, [astToTree(value.value)]);
    case 'Binary':
      return branch(`Binary ${value.op}`, [
        branch('Left', [astToTree(value.left)]),
        branch('Right', [astToTree(value.right)]),
      ]);
    case 'Constant':
      return branch(`Number: ${value.value}`);
    default:
      throw new Error('The compiler returned an unknown AST node.');
  }
}

export function findDelivery(tree: ParseTreeNode): ParseTreeNode | undefined {
  if (tree.symbol === 'Delivery') return tree;
  for (const child of tree.children) {
    const result = findDelivery(child);
    if (result) return result;
  }
}

export function collectDeliveries(tree: ParseTreeNode): { tree: ParseTreeNode; source: string }[] {
  if (tree.symbol === 'Delivery') return [{ tree, source: leaves(tree).join(' ') }];
  return tree.children.flatMap(collectDeliveries);
}

function leaves(tree: ParseTreeNode): string[] {
  return tree.children.length ? tree.children.flatMap(leaves) : tree.symbol === 'ε' ? [] : [tree.symbol];
}

export function cfgExampleFromTree(tree: ParseTreeNode) {
  const selected = findDelivery(tree);
  if (!selected) return null;

  // Number is a grammar nonterminal; NUMBER is the lexer token it matches.
  const grammarTree = (node: ParseTreeNode): ParseTreeNode => node.symbol === 'Number'
    ? branch('Number', [branch('NUMBER')])
    : branch(node.symbol, node.children.map(grammarTree));
  const root = grammarTree(selected);
  const rules = new Set<string>();
  const visit = (node: ParseTreeNode) => {
    if (node.children.length) {
      rules.add(`${node.symbol} → ${node.children.map(child => child.symbol).join(' ')}`);
      node.children.forEach(visit);
    }
  };
  visit(root);

  const frontier = [root];
  const derivation = ['Delivery'];
  let truncated = false;
  for (let step = 0; step < 200; step++) {
    const index = frontier.findIndex(node => node.children.length);
    if (index < 0) break;
    frontier.splice(index, 1, ...frontier[index].children.filter(child => child.symbol !== 'ε'));
    derivation.push(frontier.map(node => node.symbol).join(' '));
    if (step === 199) truncated = frontier.some(node => node.children.length);
  }
  const tokens = leaves(selected);
  return { source: tokens.join(' '), tokens, rules: [...rules], derivation, truncated };
}

/** A trace for this delivery's terminal tokens, not an automaton for the CFG. */
export function buildTokenPath(tokens: string[]) {
  const columns = 4;
  const states = Array.from({ length: tokens.length + 1 }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = row % 2 === 0 ? index % columns : columns - 1 - index % columns;
    return { id: `q${index}`, initial: index === 0, accepting: index === tokens.length,
      position: { x: 60 + column * 170, y: 55 + row * 150 } };
  });
  const transitions = tokens.map((token, index) => {
    const from = states[index], to = states[index + 1];
    const direction = to.position.y > from.position.y ? 'bottom' : to.position.x > from.position.x ? 'right' : 'left';
    const opposite = { bottom: 'top', right: 'left', left: 'right' };
    return { id: `token-${index}`, source: from.id, target: to.id, label: token,
      sourceHandle: `source-${direction}`, targetHandle: `target-${opposite[direction]}` };
  });
  return { states, transitions, rows: Math.ceil(states.length / columns) };
}
