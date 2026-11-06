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
