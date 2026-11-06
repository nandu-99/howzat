"""Resolve team symbols and validate arithmetic and delivery values.

Validation leaves the parser AST unchanged, so translation and optimization can
still inspect the original expressions.
"""
from .errors import CompileError, error_at

MAX_INTERMEDIATE_VALUE = 1_000_000


def evaluate(expr):
    """Evaluate supported integer expressions without executing source code."""
    if expr["type"] == "Constant":
        value = expr["value"]
        if type(value) is not int or value < 0:
            raise error_at("Expression values must be non-negative integers.", expr)
    elif expr["type"] == "Binary":
        left, right = evaluate(expr["left"]), evaluate(expr["right"])
        if expr["op"] == "+":
            value = left + right
        elif expr["op"] == "*":
            value = left * right
        else:
            raise error_at("Expressions support only addition and multiplication.", expr)
    else:
        raise error_at("Expected an integer expression.", expr)
    if value > MAX_INTERMEDIATE_VALUE:
        raise error_at("Expression exceeds the maximum intermediate value of 1,000,000.", expr)
    return value


def position(node):
    return {key: node[key] for key in ("line", "column", "end_column")}


def build_symbols(teams):
    symbols = {}
    for team in teams:
        identifier = team["id"]
        if identifier in symbols:
            raise error_at(f"Team {identifier!r} is declared twice.", team)
        if not team["name"].strip():
            raise error_at("A team name cannot be empty.", team.get("name_location", team))
        symbols[identifier] = {"kind": "team", "name": team["name"], **position(team)}
    if len(symbols) != 2:
        if len(teams) > 2:
            raise error_at("Declare exactly two distinct teams before the innings.", teams[2])
        raise CompileError("Declare exactly two distinct teams before the innings.")
    return symbols


def validate_delivery(ball):
    kind = ball["kind"]
    value = evaluate(ball["value"])
    if kind == "run":
        if not 0 <= value <= 6:
            raise error_at("Bat runs must be between 0 and 6.", ball)
    elif kind in {"bye", "legbye"}:
        if not 1 <= value <= 4:
            raise error_at("Byes and leg-byes must be between 1 and 4.", ball)
    elif kind in {"wide", "noball"}:
        if value != 1:
            raise error_at("A wide or no-ball contributes one extra run.", ball)
    elif kind == "wicket":
        if value != 0:
            raise error_at("A wicket delivery contributes zero runs.", ball)
    else:
        raise error_at(f"Unsupported delivery kind {kind!r}.", ball)
    return value


def validate(ast):
    symbols = build_symbols(ast["teams"])
    checks = []
    for innings in ast["innings"]:
        team = innings["team"]
        if team not in symbols:
            raise error_at(f"Team {team!r} has not been declared.", innings)
        for over in innings["overs"]:
            for index, ball in enumerate(over["deliveries"], start=1):
                value = validate_delivery(ball)
                checks.append({"team": team, "over": over["number"], "delivery": index,
                               "kind": ball["kind"], "value": value,
                               "status": "valid", **position(ball)})
    return {"symbol_table": symbols, "checks": checks, "validated_ast": ast}
