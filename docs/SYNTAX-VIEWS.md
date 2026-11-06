# Syntax visualizations

Syntax output has four tabs. The compiler supplies the actual AST and concrete
parse tree; visualizations do not parse a separate sample or change those results.

- AST: semantic hierarchy of teams, innings, overs, deliveries, and arithmetic.
  Left and Right branches preserve operand order and precedence.
- Parse tree: grammar structure, punctuation, terminals, and epsilon productions.
- CFG rules: productions used by the selected delivery and its leftmost derivation.
  NUMBER represents the lexical token class; values appear in the selected source.
- Token transitions: one path for the selected delivery's terminal tokens, with
  an entry arrow, initial state q0, labeled transitions, and double-circle final
  state. This is a token trace, not an automaton recognizing the whole CFG.

Trees use react-d3-tree. Drag to pan, scroll or use buttons to zoom, click branches
to expand/collapse, or reset/expand all. Branches support Enter and Space. Node
labels are shortened visually when needed; tooltips retain the full text.

The token diagram uses React Flow with fit and zoom controls. Its transition list
is also available as text. Grammar examples and token paths share the selected
delivery, including deliveries from later overs or innings. Selecting another
compiled program resets that selection. Tab navigation supports arrow keys,
Home, and End.

Derivations are bounded to 200 steps and explicitly indicate omitted steps.
Tree branches initially collapse below depth three to keep large programs usable.
