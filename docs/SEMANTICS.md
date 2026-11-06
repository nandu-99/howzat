# Semantic analysis and cricket rules

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

## Over and innings rules

- Overs start at 1 and increase by one without gaps or repeats.
- A full over has exactly six legal deliveries. A wicket uses a legal ball;
  wides and no-balls do not. Nothing may follow the sixth legal ball in that over.
- Only the final over may be `partial`, with fewer than six legal balls. It can
  contain only extras and therefore zero legal balls, but must contain a delivery.
- A team may have at most one innings. No delivery is allowed after wicket ten.
- Closing a brace or finishing a full over does not finish an innings. `complete`
  explicitly finishes it; all-out and reaching a confirmed target also finish it.
- A finished first innings establishes target = runs + 1. The second innings must
  stop at the winning delivery, including a winning wide or boundary. The whole
  boundary value is credited.
- If the first innings is unfinished, a second innings snapshot has no confirmed
  target. No target-based completion or winner is inferred from that snapshot.
- A chase level with the first score is still in progress unless marked complete
  or all out. Winning by runs or a tie requires a finished chase.

An all-out or successful chase ending before six legal balls still uses `partial`
for that final over. `innings IND complete` with a partial final over is supported.

## Report

The return value is JSON-compatible:

```text
{
  symbol_table: {identifier: {kind, name, line, column, end_column}},
  checks: [{team, over, delivery, kind, value, legal, status, line, column, end_column}],
  over_checks: [{team, over, partial, legal_balls, deliveries, wickets_so_far, status, ...position}],
  innings_checks: [{team, runs, wickets, legal_balls, target, complete, completion_reason, status, ...position}],
  validated_ast: original AST
}
```

`delivery` is the one-based position within an over's source list, including
wides and no-balls. It is not the count of legal balls. `value` is the evaluated
value of that individual delivery, not a cumulative score. A successful report
contains only valid entries; the first failure stops compilation.

The semantic output view displays symbols, legal-ball and over checks, innings
progression, and individual delivery values. Source buttons select declarations,
overs, innings, or deliveries in the editor. Rule errors use the existing error
panel and source selection. Validation leaves the AST unchanged.
