"""Execute compiler-generated Python only; never pass raw DSL source here.

An isolated Python process is not a sandbox for untrusted Python programs.
There is intentionally no public endpoint that accepts Python code.
"""
import json
import re
import subprocess
import sys
from .errors import CompileError


def validate_scorecard(output):
    """Validate the scoring boundary before results reach the UI."""
    if not isinstance(output, dict) or not isinstance(output.get("innings"), list):
        raise CompileError("Generated output must contain an innings list.")
    seen = set()
    def integer(value):
        return type(value) is int and value >= 0
    try:
        if len(output["innings"]) > 2:
            raise ValueError()
        for card in output["innings"]:
            if not isinstance(card, dict):
                raise ValueError()
            if not isinstance(card["team"], str) or not card["team"] or card["team"] in seen:
                raise ValueError()
            seen.add(card["team"])
            if not isinstance(card["name"], str) or not card["name"].strip():
                raise ValueError()
            if not integer(card["runs"]) or not integer(card["wickets"]) or card["wickets"] > 10:
                raise ValueError()
            if type(card["complete"]) is not bool or not isinstance(card["overs_display"], str) or not re.fullmatch(r"[0-9]+\.[0-5]", card["overs_display"]):
                raise ValueError()
            if "total_extras" in card and not integer(card["total_extras"]):
                raise ValueError()
            if "extras" in card and (not isinstance(card["extras"], dict) or
                any(not integer(card["extras"].get(kind)) for kind in ("wide", "noball", "bye", "legbye"))):
                raise ValueError()
            if "history" in card:
                if not isinstance(card["history"], list):
                    raise ValueError()
                for ball in card["history"]:
                    if not isinstance(ball, dict) or not isinstance(ball["kind"], str) or not isinstance(ball["score"], str) or not integer(ball["runs"]) or not integer(ball["over"]) or type(ball["legal"]) is not bool:
                        raise ValueError()
    except (KeyError, TypeError, ValueError) as error:
        raise CompileError("Generated program returned invalid scoring data.") from error
    return output


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
    return validate_scorecard(output)
