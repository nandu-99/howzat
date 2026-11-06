# Compiler integration contracts

These interfaces define how compiler phases exchange data.

## Phase modules

All module paths are relative to `backend/compiler/`.

| Phase | Module | Required public functions |
|---|---|---|
| Lexical analysis | `lexer.py` | `tokenize(source) -> list[Token]` |
| Syntax analysis | `parser.py` | `parse(tokens) -> (ast, parse_tree)` |
| Semantic analysis | `semantic.py` | `validate(ast) -> JSON-compatible semantic report` |
| Intermediate code | `ir.py` | `generate_ir(ast) -> list[dict]`; `format_ir(instructions) -> str` |
| Optimization | `optimizer.py` | `optimize(instructions) -> (optimized_instructions, changes)` |
| Target generation | `target.py` | `generate_target(optimized_instructions, ast) -> str` |

`validate` must raise an error on invalid input. Validation leaves the AST usable
by `generate_ir`. The optimizer must preserve delivery order and scoring.
All phase outputs must be JSON serializable. The driver discovers these modules
on each compile. No driver edits are needed when a phase follows this contract.

## Tokens and syntax

Tokens use `{type, lexeme, line, column}` and end with EOF. Source coordinates
are one-based. `end_column`, when present, is exclusive.

AST root: `{type: "Program", teams: [...], innings: [...]}`.
Each team has `{type: "Team", id, name, line, column}`. The target generator and
result integration require the root `teams` field. Node shapes must remain
consistent across parsing, semantic analysis, and IR generation.
See [the grammar and AST contract](GRAMMAR.md) for complete node fields.

Concrete tree nodes use `{symbol: string, children: TreeNode[]}`.
Leaf token nodes may add `lexeme`. Phase output can be inspected as JSON.

## Semantic report

See [symbol resolution and value checks](SEMANTICS.md) for the symbol table,
evaluated delivery reports, and source diagnostics. Validation preserves the AST.

## Errors

Raise `CompileError(message, line, column, end_column=None)` from `errors.py`.
Use `error_at(message, node)` when AST nodes contain source positions. The driver
adds the phase ID and stops all subsequent phases. Unexpected exceptions are
logged on the backend, with a generic diagnostic sent to the UI.

## Generated Python output

The target generator produces Python only from validated compiler data. The driver
runs it through `execution.execute_target`, using a five-second subprocess timeout.
Never send raw source to that executor. Isolated Python is not a security sandbox.

Print a single JSON object containing an `innings` list. Each innings must have:

```json
{
  "team": "IND", "name": "India", "runs": 13, "wickets": 0,
  "overs_display": "1.0", "complete": false, "total_extras": 0
}
```

This is an output-shape example, not a bundled language demo. `complete` must
reflect explicit completion, all-out, or a successful chase. The generated
runtime owns scoring; `results.match_result` owns target/winner presentation.
Exactly two teams, at most one innings each, are expected after semantic checking.
The driver adds `result` to the scorecard rather than trusting a generated result.

## HTTP and UI

- `GET /api/health`: API version, phase availability, compiler version.
- `POST /api/compile`: `{source: string}`; response is newline-delimited JSON.
- Events: `{phase: 0..5, name, status, output?, error?, duration_ms?, message?}`.
- Statuses: `running`, `completed`, `failed`, `unavailable`, `skipped`.
- The frontend adds `pending` before compilation.
- A missing phase is `unavailable`; remaining phases are `skipped`, never passed.

Phase UI components accept the corresponding `output` and are connected in
`frontend/src/main.tsx`. The editor supports selecting diagnostic spans.

## Driver tests

Tests inject phase fixtures to verify orchestration and scoring integration.
Fixtures are only in tests and are never exposed as compiler features.
