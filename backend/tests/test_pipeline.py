import json
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app
from backend.compiler.errors import CompileError
from backend.compiler.pipeline import compile_events, phase_manifest

# Fixtures exercise driver contracts only; they are not language implementations.
def fixture_modules():
    ast = {"teams": [{"id": "IND", "name": "India"}, {"id": "AUS", "name": "Australia"}], "innings": []}
    card = {"team": "IND", "name": "India", "runs": 13, "wickets": 0,
            "overs_display": "1.0", "complete": False}
    return [SimpleNamespace(tokenize=lambda source: [{"type": "EOF", "lexeme": "", "line": 1, "column": 1}]),
            SimpleNamespace(parse=lambda tokens: (ast, {"symbol": "Program", "children": []})),
            SimpleNamespace(validate=lambda ast: {"symbols": ast["teams"]}),
            SimpleNamespace(generate_ir=lambda ast: [], format_ir=lambda ir: ""),
            SimpleNamespace(optimize=lambda ir: (ir, [])),
            SimpleNamespace(generate_target=lambda ir, ast: "import json\nprint(json.dumps(" + repr({"innings": [card]}) + "))")]

class PipelineTests(unittest.TestCase):
    def test_unimplemented_phase_does_not_fake_success(self):
        events = list(compile_events("anything", lambda index: None))
        self.assertEqual([e["status"] for e in events], ["unavailable"] + ["skipped"] * 5)

    def test_success_runs_all_phases_and_executes_generated_code(self):
        modules = fixture_modules()
        events = list(compile_events("source fixture", lambda index: modules[index]))
        self.assertEqual(len(events), 12)
        self.assertEqual([e["phase"] for e in events if e["status"] == "completed"], list(range(6)))
        output = events[-1]["output"]
        self.assertEqual(output["scorecard"]["innings"][0]["runs"], 13)
        self.assertEqual(output["scorecard"]["result"]["status"], "in_progress")
        json.dumps(events)

    def test_error_location_survives_and_later_phases_do_not_run(self):
        modules = fixture_modules()
        def fail(tokens):
            raise CompileError("Missing comma", 6, 13, 14)
        modules[1].parse = fail
        visited = []
        def load(index):
            visited.append(index)
            return modules[index]
        events = list(compile_events("fixture", load))
        failure = next(e for e in events if e["status"] == "failed")
        self.assertEqual(failure["error"], {"message": "Missing comma", "line": 6, "column": 13, "end_column": 14})
        self.assertEqual(visited, [0, 1])
        self.assertEqual([e["phase"] for e in events if e["status"] == "skipped"], [2, 3, 4, 5])

    def test_import_failure_is_a_failed_phase(self):
        def bad_import(index):
            raise ImportError("a phase has a broken dependency")
        with self.assertLogs("backend.compiler.pipeline", level="ERROR"):
            events = list(compile_events("fixture", bad_import))
        self.assertEqual(events[0]["status"], "failed")
        self.assertNotIn("dependency", events[0]["error"]["message"])

    def test_missing_function_is_reported_unavailable(self):
        with patch("backend.compiler.pipeline.import_module", return_value=SimpleNamespace()):
            self.assertFalse(any(p["available"] for p in phase_manifest()))

    def test_api_health_and_stream(self):
        with TestClient(app) as client:
            health = client.get("/api/health").json()
            self.assertEqual(health["api_version"], 1)
            self.assertEqual(len(health["phases"]), 6)
            response = client.post("/api/compile", json={"source": "test"})
            self.assertEqual(response.status_code, 200)
            self.assertIn("application/x-ndjson", response.headers["content-type"])
            self.assertEqual(json.loads(response.text.splitlines()[0])["status"], "unavailable")
            self.assertEqual(client.post("/api/compile", json={"source": ""}).status_code, 422)
            self.assertEqual(client.post("/api/compile", json={"source": "a" * 50001}).status_code, 422)

if __name__ == "__main__":
    unittest.main()
