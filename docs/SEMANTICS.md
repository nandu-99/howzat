# Symbol resolution and value checks

`backend/compiler/semantic.py` exposes `validate(ast)`. The compiler driver calls
it after parsing and before intermediate code generation.

## Team symbols

The symbol table is keyed by case-sensitive team identifier. Each entry records
the team name, kind (`team`), and the declaration identifier's source location.
Declare exactly two distinct identifiers. Duplicate identifiers, empty or
whitespace-only names, and unresolved innings references produce diagnostics.
Different identifiers may have the same display name.

## Integer expressions

`evaluate(expression)` recursively evaluates Constant and Binary AST nodes using
integer addition and multiplication. It never executes source text. Intermediate
values are bounded at 1,000,000; overflow points to the operator that caused it.
The parser controls precedence and associativity. Semantic validation leaves
expressions intact in the AST for IR generation and optimization.

## Delivery values

- Bat runs: 0 through 6, inclusive.
- Byes and leg-byes: 1 through 4, inclusive.
- Wide and no-ball: constant 1, as constructed by the parser.
- Wicket: constant 0, as constructed by the parser.

Invalid values point to the delivery's source token. Expression overflow points
to its operator instead. All diagnostics use the shared CompileError format.

## Report

The return value is JSON-compatible:

```text
{
  symbol_table: {identifier: {kind, name, line, column, end_column}},
  checks: [{team, over, delivery, kind, value, status, line, column, end_column}],
  validated_ast: original AST
}
```

`delivery` is the one-based position within an over's source list, including
wides and no-balls. It is not the count of legal balls. `value` is the evaluated
value of that individual delivery, not a cumulative score. A successful report
contains only valid entries; the first failure stops compilation.

The semantic output view displays symbols and delivery values. Source buttons
select declarations or deliveries in the editor. Over length, over sequence,
wicket totals, and match progression are separate rule checks; this report's
entries describe symbol and delivery-value validation.
