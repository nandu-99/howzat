"""Resolve team symbols and validate arithmetic, deliveries, and cricket rules.

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
    checks, over_checks, innings_checks = [], [], []
    seen = set()
    for innings in ast["innings"]:
        team = innings["team"]
        if team not in symbols:
            raise error_at(f"Team {team!r} has not been declared.", innings)
        if team in seen:
            raise error_at(f"Team {team!r} already has an innings.", innings)
        seen.add(team)
        runs, wickets, legal_balls = 0, 0, 0
        target = innings_checks[0]["runs"] + 1 if innings_checks and innings_checks[0]["complete"] else None
        for over_index, over in enumerate(innings["overs"]):
            if over["number"] != over_index + 1:
                raise error_at(f"Expected over {over_index + 1}, found over {over['number']}.", over)
            if over["partial"] and over_index != len(innings["overs"]) - 1:
                raise error_at("Only the final over of an innings may be partial.", over)
            legal = 0
            for index, ball in enumerate(over["deliveries"], start=1):
                if wickets >= 10:
                    raise error_at("No deliveries are allowed after the tenth wicket.", ball)
                if target is not None and runs >= target:
                    raise error_at("The chase has already been won. Remove deliveries after the winning run.", ball)
                if legal >= 6:
                    raise error_at("An over ends at its sixth legal delivery. Move subsequent deliveries into the next over.", ball)
                value = validate_delivery(ball)
                is_legal = ball["kind"] not in {"wide", "noball"}
                legal += int(is_legal)
                legal_balls += int(is_legal)
                wickets += int(ball["kind"] == "wicket")
                runs += 0 if ball["kind"] == "wicket" else value
                checks.append({"team": team, "over": over["number"], "delivery": index,
                               "kind": ball["kind"], "value": value, "legal": is_legal,
                               "status": "valid", **position(ball)})
            if over["partial"] and legal >= 6:
                raise error_at("A partial over must contain fewer than 6 legal deliveries.", over)
            if not over["partial"] and legal != 6:
                raise error_at(f"Over {over['number']} has {legal} legal deliveries; a completed over needs exactly 6. Use 'partial' for an unfinished final over.", over)
            over_checks.append({"team": team, "over": over["number"], "partial": over["partial"],
                                "legal_balls": legal, "deliveries": len(over["deliveries"]),
                                "wickets_so_far": wickets, "status": "valid", **position(over)})
        reason = ("target_reached" if target is not None and runs >= target else
                  "all_out" if wickets == 10 else "marked_complete" if innings["complete"] else None)
        innings_checks.append({"team": team, "runs": runs, "wickets": wickets,
                               "legal_balls": legal_balls, "target": target,
                               "complete": reason is not None, "completion_reason": reason,
                               "status": "valid", **position(innings)})
    return {"symbol_table": symbols, "checks": checks, "over_checks": over_checks,
            "innings_checks": innings_checks, "validated_ast": ast}
