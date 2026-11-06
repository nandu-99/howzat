# Howzat

A cricket scoring compiler with an interactive editor, compiler phase outputs,
source diagnostics, and scorecards.

## Setup

Run from this `howzat` repository, not its parent `workshop` directory.
Requires Python 3.10+ and Node.js 20.19+ (or Node.js 22.12+).

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cd frontend
npm install
cd ..
python3 dev.py
```

Open http://127.0.0.1:5173. API documentation: http://127.0.0.1:8000/docs.
Ctrl+C stops both servers. `python3 dev.py --check` checks dependencies first.
If port 8000 or 5173 is occupied by the old workshop app, stop that app in its
terminal before starting this repository's app.

Alternatively, use two terminals from the repository root:

```bash
# Terminal 1
source .venv/bin/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend
```

```bash
# Terminal 2
cd frontend
npm run dev
```

## Checks

```bash
.venv/bin/python -m unittest discover -s backend/tests -v
npm --prefix frontend test
npm --prefix frontend run build
```

The build emits `frontend/dist`. Restart the backend after building to serve the
built application from port 8000 as well. During development use port 5173.

## Language

See [the language definition](docs/LANGUAGE.md) for keywords, token patterns,
and source conventions. Select a token value in the lexical output to locate it
in the editor.

See [the grammar and AST contract](docs/GRAMMAR.md) for parser productions,
expression precedence, syntax structures, and diagnostics.

See [semantic checks](docs/SEMANTICS.md) for team symbol resolution, expression
validation, delivery values, cricket rules, and semantic diagnostics.

See [intermediate and target code](docs/TRANSLATION.md) for IR instructions,
Python generation, and scoring runtime behavior.

See [constant optimization](docs/OPTIMIZATION.md) for folding, propagation,
and the before/after comparison.

## Architecture

Read [the compiler contracts](docs/CONTRACTS.md) for module interfaces and data formats.

The backend coordinates six compiler phases and streams their outputs to the UI.
Compilation stops when a phase fails or is unavailable. Diagnostics include source
positions, and generated Python executes with a time limit to return scoring data.

The frontend uses a 30/70 desktop layout with an editor, a compact phase strip,
phase output details, and a scorecard.
