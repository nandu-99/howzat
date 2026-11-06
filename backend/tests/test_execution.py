import unittest
from backend.compiler.execution import execute_target
from backend.compiler.errors import CompileError

class ExecutionTests(unittest.TestCase):
    def test_generated_json(self):
        self.assertEqual(execute_target('import json; print(json.dumps({"innings": []}))'), {"innings": []})

    def test_timeout(self):
        with self.assertRaisesRegex(CompileError, "time limit"):
            execute_target('while True: pass', timeout=0.1)

    def test_runtime_failure(self):
        with self.assertRaisesRegex(CompileError, "could not be executed"):
            execute_target('raise ValueError("test")')

    def test_malformed_output(self):
        for code in ['print("hello")', 'print("[]")', 'print("{}")']:
            with self.subTest(code=code), self.assertRaises(CompileError):
                execute_target(code)

class ScoringBoundaryTests(unittest.TestCase):
    def test_invalid_scorecards_are_diagnostics(self):
        import json
        valid = {'team': 'IND', 'name': 'India', 'runs': 13, 'wickets': 0,
                 'complete': False, 'overs_display': '1.0'}
        for updates in [{'runs': '13'}, {'wickets': 11}, {'complete': 'yes'},
                        {'overs_display': '1.6'}, {'history': {}}, {'extras': {}}]:
            with self.subTest(updates=updates), self.assertRaisesRegex(CompileError, 'invalid scoring data'):
                execute_target('import json; print(json.dumps(' + repr({'innings':[dict(valid,**updates)]}) + '))')

    def test_duplicate_innings_are_rejected_at_output_boundary(self):
        card = {'team': 'IND', 'name': 'India', 'runs': 13, 'wickets': 0,
                'complete': False, 'overs_display': '1.0'}
        with self.assertRaisesRegex(CompileError, 'invalid scoring data'):
            execute_target('import json; print(json.dumps(' + repr({'innings':[card,card]}) + '))')
