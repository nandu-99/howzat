"""Execute compiler-generated Python only; never pass raw DSL source here.

An isolated Python process is not a sandbox for untrusted Python programs.
There is intentionally no public endpoint that accepts Python code.
"""
import json
import subprocess
import sys
from .errors import CompileError


def execute_target(code, timeout=5):
    try:
        process = subprocess.run(
            [sys.executable, "-I", "-S", "-c", code],
            capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired as error:
        raise CompileError("Generated program exceeded the execution time limit.") from error
    if process.returncode:
        raise CompileError("Generated Python could not be executed. Check the target generator.")
    try:
        output = json.loads(process.stdout)
    except json.JSONDecodeError as error:
        raise CompileError("Generated program must print one JSON scoring object.") from error
    if not isinstance(output, dict) or not isinstance(output.get("innings"), list):
        raise CompileError("Generated output must contain an innings list.")
    return output
