# Intermediate and target code

## Intermediate representation

`generate_ir(ast)` lowers a validated AST to an ordered instruction list without
mutating it or simplifying arithmetic. Numbers are immediate operands; temporary
names such as `t1` refer to preceding arithmetic instructions. Temporary names
are unique within a program.

| Operation | Fields | Meaning |
|---|---|---|
| INNINGS | team, complete | Begin scoring a team's innings |
| OVER | number, partial | Begin an over |
| ADD | target, left, right | Assign the sum to a temporary |
| MUL | target, left, right | Assign the product to a temporary |
| DELIVERY | kind, value, line, column, end_column | Emit one delivery |
| END_INNINGS | none | Close the innings |

Expressions emit dependency-ordered three-address code. For `run(2 + 2 * 2)`:

```text
t1 = 2 * 2
t2 = 2 + t1
  EMIT_DELIVERY run, t2
```

Delivery source metadata is retained internally. `format_ir(instructions)`
produces a readable listing without source-line comments. Innings and partial
over flags appear in the listing. Unknown operations are rejected.

## Python generation

`generate_target(instructions, ast)` returns standalone Python using only the
standard library. Team names and instruction data are serialized as literal data.
The runtime resolves ADD and MUL temporaries and immediate numeric operands, so
it accepts both unsimplified and constant-substituted IR. Raw DSL is never run as
Python. Optimizing the IR is a separate transformation.

The generated program prints one JSON object with an `innings` list. Each innings
includes its score, wickets, legal balls, overs display, run rate, extras, over
summaries, delivery history, and completion state. Wides and no-balls add extras
without using legal balls. Wickets add no runs. Explicit completion, ten wickets,
and reaching a confirmed chase target determine completion metadata.

The executor applies its timeout and parses the JSON output. The compiler driver
adds the match-result report using `results.match_result`. Isolated execution is
not a sandbox for arbitrary Python; only compiler-generated programs belong here.

## Output views

The intermediate view shows the formatted instructions and count. The target
view shows generated Python; the existing scorecard displays executed results.

The driver preserves its strict six-phase order. A missing optimizer is reported
as unavailable and stops the stream. Translation tests use an explicitly labeled
test-only identity adapter to exercise real code generation and execution without
introducing an optimizer substitute into the application.
