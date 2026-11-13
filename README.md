# Howzat - Cricket Scoring Compiler

Howzat is a compiler-design project that turns cricket scoring instructions into
an executable Python program and a scorecard. Its small domain-specific language
(DSL) describes teams, innings, overs, and deliveries. The web interface shows
what happens at each of the six compiler phases, making the project useful for
learning and demonstrating compiler concepts.

The outputs come from the actual compiler: tokens, parse trees, an abstract syntax
tree (AST), semantic checks, intermediate instructions, optimized instructions,
and generated Python. The generated program runs on the backend to produce the
scorecard; it is not a hardcoded preview.

## Live demo

- [Open the playground](https://howzat-nine.vercel.app/)
- [Read the language guide](https://howzat-nine.vercel.app/language)
- [Check backend health](https://howzat-f1nj.onrender.com/api/health)

The frontend is hosted on Vercel and the backend on Render. Vercel forwards
`/api/*` requests to the backend. No database is required.

## Run locally

### Requirements

- Python 3.10 or newer, with `pip` and `venv`.
- Node.js 20.19+ or 22.12+, with npm.
- An internet connection for the initial dependency installation. No database,
  API keys, or `.env` configuration is required.

Clone the repository and enter its folder (Git must be installed):

```bash
git clone https://github.com/nandu-99/howzat.git
cd howzat
```

Run all setup commands below **inside this `howzat` repository**, where `dev.py`,
`backend/`, and `frontend/` are located. If you already cloned it, enter that
existing folder instead.

### First-time setup — macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
python3 dev.py --check
python3 dev.py
```

### First-time setup — Windows PowerShell

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm --prefix frontend ci
py dev.py --check
py dev.py
```

The launcher uses the repository's `.venv` and starts both servers. It checks
that ports 8000 and 5173 are available. Stop it with **Ctrl+C**.

| Page | Local address |
|---|---|
| Playground | http://127.0.0.1:5173/ |
| Language guide | http://127.0.0.1:5173/language |
| Interactive API documentation | http://127.0.0.1:8000/docs |
| Backend health and available phases | http://127.0.0.1:8000/api/health |

For later runs, use `python3 dev.py` on macOS/Linux or `py dev.py` on Windows.
Source changes reload automatically.

### Run backend and frontend separately

Use two terminals, both starting in the repository root. The following backend
command is for macOS/Linux; on Windows, replace `.venv/bin/python` with
`.\.venv\Scripts\python.exe`.

**Terminal 1 — backend:**

```bash
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend
```

**Terminal 2 — frontend:**

```bash
npm --prefix frontend run dev
```

Open port **5173** during development. Vite forwards `/api` requests to the backend
on port 8000. The frontend needs the backend to compile and load reference data.

## Evaluator walkthrough

1. Open the playground and keep **Start here: one over** selected.
2. Click **Compile**, or press **Ctrl+Enter / Cmd+Enter** in the editor.
3. Check that all six phases pass and the scorecard shows **13/0 in 1.0 overs**.
4. Select each phase to inspect tokens, trees, rule checks, instructions,
   optimization, and generated Python. Token values and semantic source buttons
   locate the original code in the editor.
5. Choose **See code simplification** to demonstrate constant folding and compare
   the instructions before and after optimization.
6. Choose **Score a completed match** to see India win by **3 runs**.
7. Try an error example. Inspect the failed phase, click **Show in editor**, then
   **Load corrected code** and compile again. Later phases are skipped after a
   failure, and no successful scorecard is shown.
8. Open **Language guide** for the token regex, keyword definitions, cricket rules,
   grammar, example trees, and derivations. **Try in playground** loads an example
   without compiling it automatically.

The editor has syntax highlighting and line numbers. Navigation between the
playground and guide preserves the current source and compiler results. Editor
text is also saved for the current browser session. A running compilation can be
cancelled; stale responses cannot overwrite newer source or results.

### Included examples

The example menu contains exactly **five correct programs and three errors**.

| Example | What to demonstrate | Expected result |
|---|---|---|
| Start here: one over | Basic compilation | 13/0 in 1.0 overs; innings in progress |
| Add wides and no-balls | Extras and legal-ball counting | 16/0 in 1.0 overs, including 5 extras |
| Take wickets and stop early | Wickets and a partial over | 13/3 in 1.2 overs; innings in progress |
| See code simplification | Constant folding and propagation | 14/0; three temporary assignments removed |
| Score a completed match | Two innings and a match result | India 21/1, Australia 18/1; India win by 3 runs |
| Find an unknown character | Lexical error | Phase 1 fails |
| Find a missing comma | Syntax error | Phase 2 fails |
| Try to take 11 wickets | Semantic error | Phase 3 rejects the eleventh wicket |

Overs use cricket notation: **1.2 means one over and two legal balls**, not a
decimal fraction.

## A small Howzat program

```text
team IND "India";
team AUS "Australia";

// India scores 13 runs in six legal balls.
innings IND {
  over 1 { 0, 1, 4, 0, 2, 6 }
}
```

Declare exactly two teams, even when recording only one innings. Team declarations
end with semicolons, braces group innings and overs, and commas separate
deliveries. Keywords are lowercase and case-sensitive.

| Write | Meaning |
|---|---|
| `0` through `6` | Bat runs; `0` is a dot ball |
| `wicket` | One wicket, using a legal ball |
| `wide`, `noball` | One extra run each; neither uses a legal ball |
| `run(2 + 2)` | Bat runs calculated from an integer expression |
| `bye(2)`, `legbye(1)` | Byes or leg-byes, using a legal ball |
| `over 2 partial { ... }` | An unfinished final over with fewer than six legal balls |
| `innings IND complete { ... }` | Explicitly mark an innings as finished |

Expressions support addition, multiplication, and parentheses. Bat runs must be
0-6; byes and leg-byes must be 1-4. Overs start at 1 and progress sequentially.
A full over contains exactly six legal balls; nothing may follow wicket ten.

Closing an innings brace does not by itself finish that innings. A finished first
innings establishes a chase target. A result is shown when enough information is
available; two declared teams or an unfinished snapshot alone do not establish a
winner. All-out and confirmed target completion also finish an innings.

This is a focused scoring language, not a full cricket simulation: it does not
model individual batters, bowlers, fielding, or combined outcomes such as a no-ball
hit for four. A wide or no-ball is a standalone one-run event in this model.

## How the compiler works

| Phase | Concept | Output shown in the UI |
|---|---|---|
| 1. Lexical analysis | Match characters to token patterns | Keywords, identifiers, numbers, strings, symbols, and source positions |
| 2. Syntax analysis | Parse the context-free grammar | AST, parse tree, selected-delivery CFG productions, and token transitions |
| 3. Semantic analysis | Resolve symbols and validate meaning | Team symbol table, delivery values, over rules, and innings checks |
| 4. Intermediate code | Translate the AST into scoring instructions | Ordered instructions with temporary expression values |
| 5. Code optimization | Fold constants and propagate temporary values | Before/after instructions, changes, and instruction counts |
| 6. Target code generation | Generate and execute Python | Python source, validated scoring data, and scorecard |

Optimization simplifies calculations such as `run(2 + 2)`. Plain numeric deliveries
may have nothing to simplify; that is a valid outcome. Optimization preserves
delivery order and scores.

The guide contains the language's context-free grammar (CFG). The separate token
transition diagram follows the tokens of one selected delivery from an initial
state to a final state; it is not a diagram of the entire language grammar.

The backend streams phase events as newline-delimited JSON. It stops at the first
failure. Generated Python runs in a separate process with a five-second time
limit, and its scoring output is validated before reaching the UI.

## Project structure

```text
howzat/
├── backend/
│   ├── main.py              # FastAPI routes and streamed compilation
│   ├── language.py          # Token definitions, examples, language reference
│   ├── compiler/            # Lexer, parser, semantics, IR, optimizer, Python target
│   └── tests/               # Compiler and API tests
├── frontend/
│   ├── src/                 # React editor, guide, phase views, diagrams, scorecard
│   ├── public/assets/       # Logo and stadium imagery
│   └── tests/               # Component, transformation, and application flow tests
├── docs/                    # Language and compiler documentation
└── dev.py                   # Local backend + frontend launcher
```

The frontend uses React, TypeScript, and Vite; Radix Select provides custom menus,
react-d3-tree renders trees, and React Flow renders token transitions. The backend
uses Python, FastAPI, and Uvicorn. The compiler phases are implemented in Python.

## Tests and build

Install both Python and frontend dependencies first: frontend flow tests use
actual compiler events produced by Python. From the repository root:

```bash
.venv/bin/python -m unittest discover -s backend/tests -v
npm --prefix frontend test
npm --prefix frontend run build
```

On Windows, use `.\.venv\Scripts\python.exe` in place of `.venv/bin/python`.

Verified on **10 November 2026**: **114 backend tests**, **45 frontend tests**, and
the TypeScript/production build passed. Coverage includes grammar, rule errors,
optimization, scoring, source selection, corrected examples, dropdown keyboard
controls, guide navigation, cancellation, and offline recovery.

DOM flow tests substitute tree/graph canvas renderers; they do not replace visual
browser checks of diagram rendering and responsive layouts. The build currently
reports a non-blocking JavaScript chunk-size warning.

### Serve the built app locally

After `npm --prefix frontend run build`, stop and restart the backend:

```bash
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/ or http://127.0.0.1:8000/language. The backend mounts
`frontend/dist` at startup, so build before starting it. A separate Vite server is
not needed in this mode.

## Troubleshooting

| Symptom | What to do |
|---|---|
| `Address already in use` / launcher reports an occupied port | Stop the earlier server with Ctrl+C in its terminal. On macOS/Linux, `lsof -nP -iTCP:8000 -sTCP:LISTEN` or the same command with `5173` identifies the listener. |
| `No module named backend` | Run the backend command from the repository root, not inside `backend/`. |
| `No module named fastapi` | Install requirements using this repository's `.venv` Python, then run `python3 dev.py --check`. |
| Frontend dependencies are missing | Run `npm --prefix frontend ci` from the repository root. |
| Backend disconnected / compilation disabled | Check the backend terminal and `/api/health`; start port 8000, then use the UI retry control. |
| `/language` or `/` is missing on port 8000 | Build the frontend, then restart the backend; use port 5173 for development. |
| Frontend tests cannot locate Python | Create `.venv` in the repository root and install the backend requirements. |

## Further reading

- [Language and lexical rules](docs/LANGUAGE.md)
- [Grammar and AST contract](docs/GRAMMAR.md)
- [Semantic analysis and cricket rules](docs/SEMANTICS.md)
- [Intermediate instructions and Python generation](docs/TRANSLATION.md)
- [Constant optimization](docs/OPTIMIZATION.md)
- [Syntax visualizations](docs/SYNTAX-VIEWS.md)
- [Compiler module contracts](docs/CONTRACTS.md)
- [Design and typography](docs/DESIGN.md)
