# Howzat — Cricket Scoring Compiler

Howzat turns cricket scoring instructions into an executable Python program and
a scorecard. Its small domain-specific language (DSL) describes teams, innings,
overs, and deliveries. The website shows the actual output of all six compiler
phases, so users can follow how source code becomes a result.

## Demo and report

- [Live playground](https://howzat-nine.vercel.app/)
- [Language guide](https://howzat-nine.vercel.app/language)
- [Backend health](https://howzat-f1nj.onrender.com/api/health)
- **[IEEE project report (PDF)](report/howzat-ieee-report.pdf)**

## Features

- Source editor with syntax highlighting, line numbers, and custom example menus.
- Tokens with original source positions, interactive AST and parse trees, and
  selected-delivery grammar rules, derivations, and token transitions.
- Symbol table and checks for team references, run values, overs, wickets, and chases.
- Intermediate instructions, constant folding and propagation, and a before/after comparison.
- Generated Python that executes to produce scores, extras, run rates, delivery
  history, targets, and match results.
- Clear lexical, syntax, and semantic errors with source selection and corrected examples.
- Five correct examples and three error examples, plus an interactive language guide.
- Responsive layout, keyboard controls, request cancellation, and connection retry.

No database, login, API key, or `.env` file is required. Source text is saved in
browser session storage. Results stay available during route navigation but are
not restored after a page refresh.

## Requirements and dependencies

Install **Git**, **Python 3.10+** with `pip`/`venv`, and **Node.js 20.19+ or 22.12+**
with npm. An internet connection is needed for the first dependency installation.

| Area | Dependencies | Dependency file |
|---|---|---|
| Backend | FastAPI, Uvicorn, HTTPX for API tests | `backend/requirements.txt` |
| Frontend | React, TypeScript, Vite, React Router | `frontend/package.json` |
| UI and diagrams | Radix Select/icons, react-d3-tree, React Flow, Fontsource fonts | `frontend/package.json` |
| Tests | Python unittest, Node test runner, jsdom | Backend requirements and frontend package files |

The Python standard library supplies the compiler logic and generated scoring
runtime. `frontend/package-lock.json` records the resolved frontend dependencies;
use `npm ci` to install them.

## Quick start

Clone the repository and enter its root folder:

```bash
git clone https://github.com/nandu-99/howzat.git
cd howzat
```

If already cloned, enter the existing folder. Run all commands below from the
folder containing `dev.py`, `backend/`, and `frontend/`.

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
python3 dev.py --check
python3 dev.py
```

### Windows PowerShell

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
npm --prefix frontend ci
py dev.py --check
py dev.py
```

The launcher starts both servers and checks that ports 8000 and 5173 are free.
Stop both with **Ctrl+C**. After setup, run `python3 dev.py` again on macOS/Linux
or `py dev.py` on Windows; dependency installation is not needed for every run.

| Page | Local URL |
|---|---|
| Playground | http://127.0.0.1:5173/ |
| Language guide | http://127.0.0.1:5173/language |
| API documentation | http://127.0.0.1:8000/docs |
| Backend health | http://127.0.0.1:8000/api/health |

### Run the servers separately

Use two terminals, both starting in the repository root.

**Terminal 1 — backend:**

```bash
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir backend
```

**Terminal 2 — frontend:**

```bash
npm --prefix frontend run dev
```

On Windows, replace `.venv/bin/python` with `.\.venv\Scripts\python.exe`.
Open port **5173** during development. The frontend needs the backend to compile
programs and load examples and language-reference data.

## Try the compiler

1. Select **Start here: one over** and click **Compile** or press **Ctrl/Cmd+Enter**.
2. Confirm that all six phases pass and the scorecard shows **13/0 in 1.0 overs**.
3. Select each phase to inspect its output. Click token values or semantic source
   buttons to locate the original code.
4. Try **See code simplification** to inspect constant optimization.
5. Try **Score a completed match** to see India win by **3 runs**.
6. Compile an error example, use **Show in editor**, then **Load corrected code**
   and compile again.

| Built-in example | Expected outcome |
|---|---|
| Start here: one over | 13/0 in 1.0 overs; innings in progress |
| Add wides and no-balls | 16/0 in 1.0 overs; 5 extras |
| Take wickets and stop early | 13/3 in 1.2 overs; innings in progress |
| See code simplification | 14/0 in 1.0 overs; three temporary assignments removed |
| Score a completed match | India 21/1, Australia 18/1; India win by 3 runs |
| Find an unknown character | Lexical analysis fails |
| Find a missing comma | Syntax analysis fails |
| Try to take 11 wickets | Semantic analysis rejects the eleventh wicket |

## Language example

```text
team IND "India";
team AUS "Australia";

innings IND {
  over 1 { 0, 1, 4, 0, 2, 6 }
}
```

Declare exactly two teams, even when recording one innings. Semicolons end team
declarations, braces group blocks, and commas separate deliveries. Keywords are
lowercase and case-sensitive.

- `0`–`6`: bat runs. `run(2 + 2)` also records bat runs using an expression.
- `wicket`: one wicket, zero runs, and one legal ball.
- `wide` / `noball`: one extra run each, without using a legal ball.
- `bye(2)` / `legbye(1)`: extras using a legal ball; values must be 1–4.
- `over 2 partial { ... }`: an unfinished final over with fewer than six legal balls.
- `innings IND complete { ... }`: explicitly finish an innings.

Expressions support `+`, `*`, and parentheses. A full over has six legal balls.
**1.2 overs means one over and two balls**, not a decimal fraction. Closing an
innings block does not itself finish the innings. Explicit completion, all-out,
or reaching a confirmed target determines completion and the match result.

The model supports one innings per team. It does not model individual players,
combined no-ball/bat-run outcomes, rain-adjusted targets, or super overs.

## Compiler workflow

```text
Source → Tokens → AST / Parse tree → Semantic checks
       → Intermediate code → Optimized code → Python → Scorecard
```

| Phase | Output |
|---|---|
| 1. Lexical analysis | Token types, original text, and source positions |
| 2. Syntax analysis | AST, concrete parse tree, selected-delivery CFG rules and token trace |
| 3. Semantic analysis | Symbol table, expression values, over/innings and delivery checks |
| 4. Intermediate code | Ordered scoring instructions and arithmetic temporaries |
| 5. Code optimization | Constant folding/propagation, changes, and instruction counts |
| 6. Target code generation | Generated Python and validated execution results |

The parser uses recursive descent. CFG means **context-free grammar**; the token
transition diagram traces one delivery and is not an automaton for the full grammar.
The backend streams phase events as newline-delimited JSON and stops at the first
failure. Later phases are skipped. Generated Python runs with a five-second
execution timeout. Plain numeric deliveries may need no optimization.

## Tests and production build

Install both Python and frontend dependencies first. Frontend flow tests use
actual compiler events produced by Python.

```bash
.venv/bin/python -m unittest discover -s backend/tests -v
npm --prefix frontend test
npm --prefix frontend run build
```

On Windows, use `.\.venv\Scripts\python.exe` instead of `.venv/bin/python`.
Verified on **25 November 2026**: **114 backend tests**, **45 frontend tests**, and
the TypeScript/production build passed. Tests cover compiler correctness, scoring,
optimization, source links, corrections, navigation, keyboard controls, and cancellation.
DOM flow tests substitute canvas renderers; tree appearance and interactions also
need browser checks. The build reports a non-blocking JavaScript chunk-size warning.

The build creates `frontend/dist`. To serve the built app and API together, stop
any existing backend and start it **after building**:

```bash
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/ or http://127.0.0.1:8000/language. A separate frontend
server is not needed in this mode.

## Project files and deployment

```text
howzat/
├── backend/                 # API, all compiler phases, runtime, results, tests
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/                 # Editor, guide, phase views, scorecard, shared styles
│   ├── public/assets/       # Logo, favicon, and stadium image
│   ├── package.json         # Frontend dependencies and commands
│   ├── package-lock.json    # Resolved dependency versions
│   ├── vite.config.ts       # Local API proxy
│   └── vercel.json          # Deployed API and guide routing
├── docs/                    # Language and compiler specifications
├── report/
│   └── howzat-ieee-report.pdf
└── dev.py                   # Starts both local development servers
```

Source files, configuration, dependency manifests, and required image assets are
included. Fonts are installed through npm and bundled by Vite. `.venv`,
`node_modules`, and `dist` are generated locally and intentionally ignored;
install dependencies and build them using the commands above.

The deployed frontend uses Vercel with Root Directory `frontend`, build command
`npm run build`, and output directory `dist`. Its `/api/*` rewrite forwards requests
to the Render backend; `/language` serves the React entry page. The local Vite
proxy instead forwards `/api` to port 8000. No `VITE_API_URL` is needed for this setup.

The Render backend uses the repository root, build command
`pip install -r backend/requirements.txt`, and start command:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

If using another backend address, update the API destination in
`frontend/vercel.json`. `dev.py` is for local development, not production hosting.

## Troubleshooting

| Problem | Fix |
|---|---|
| Port 8000 or 5173 is already in use | Stop the earlier server with Ctrl+C, then restart. |
| `No module named backend` | Run commands from the repository root using `backend.main:app`. |
| Python dependencies are missing | Install `backend/requirements.txt` using the repository's `.venv` Python. |
| Frontend dependencies are missing | Run `npm --prefix frontend ci`. |
| Backend disconnected | Check the backend terminal or health URL, then retry the UI connection. |
| `/language` is missing on port 8000 | Build the frontend and restart the backend; use port 5173 during development. |
| Frontend flow tests cannot locate Python | Create `.venv` in the repository root and install backend dependencies. |

## Documentation

- [IEEE project report (PDF)](report/howzat-ieee-report.pdf)
- [Language and token definitions](docs/LANGUAGE.md)
- [Grammar and AST](docs/GRAMMAR.md)
- [Semantic and cricket rules](docs/SEMANTICS.md)
- [Intermediate code and Python generation](docs/TRANSLATION.md)
- [Optimization](docs/OPTIMIZATION.md)
- [Syntax views](docs/SYNTAX-VIEWS.md)
- [Compiler interfaces](docs/CONTRACTS.md)
- [Design and typography](docs/DESIGN.md)
