"""Generate standalone Python from compiler IR; source text is never executed."""

RUNTIME = r'''
def resolve(value):
    return temporaries[value] if isinstance(value, str) else value

scorecards = []
temporaries = {}
current = None
over = None
for instruction in instructions:
    op = instruction["op"]
    if op in ("ADD", "MUL"):
        left = resolve(instruction["left"])
        right = resolve(instruction["right"])
        temporaries[instruction["target"]] = left + right if op == "ADD" else left * right
    elif op == "INNINGS":
        current = {
            "team": instruction["team"], "name": teams[instruction["team"]],
            "runs": 0, "wickets": 0, "legal_balls": 0,
            "complete": instruction.get("complete", False),
            "extras": {"wide": 0, "noball": 0, "bye": 0, "legbye": 0},
            "overs": [], "history": [],
        }
        scorecards.append(current)
        over = None
    elif op == "OVER":
        over = {
            "number": instruction["number"], "partial": instruction["partial"],
            "runs": 0, "wickets": 0, "legal_balls": 0, "deliveries": [],
        }
        current["overs"].append(over)
    elif op == "DELIVERY":
        kind = instruction["kind"]
        value = resolve(instruction["value"])
        legal = kind not in ("wide", "noball")
        runs = 0 if kind == "wicket" else value
        current["runs"] += runs
        current["wickets"] += int(kind == "wicket")
        current["legal_balls"] += int(legal)
        if kind in current["extras"]:
            current["extras"][kind] += runs
        over["runs"] += runs
        over["wickets"] += int(kind == "wicket")
        over["legal_balls"] += int(legal)
        ball = {
            "kind": kind, "value": value, "runs": runs, "legal": legal,
            "line": instruction["line"], "over": over["number"],
            "ball": over["legal_balls"],
            "score": str(current["runs"]) + "/" + str(current["wickets"]),
        }
        over["deliveries"].append(ball)
        current["history"].append(ball)
    elif op == "END_INNINGS":
        current = None
        over = None
    else:
        raise ValueError("Unknown IR operation: " + str(op))

for card in scorecards:
    balls = card["legal_balls"]
    card["overs_display"] = str(balls // 6) + "." + str(balls % 6)
    card["run_rate"] = round(card["runs"] * 6 / balls, 2) if balls else 0
    card["total_extras"] = sum(card["extras"].values())
    card["completion_reason"] = "all_out" if card["wickets"] == 10 else "marked_complete" if card["complete"] else None
    card["complete"] = card["complete"] or card["wickets"] == 10
if len(scorecards) == 2 and scorecards[0]["complete"] and scorecards[1]["runs"] > scorecards[0]["runs"]:
    scorecards[1]["complete"] = True
    scorecards[1]["completion_reason"] = "target_reached"
print(json.dumps({"innings": scorecards}))
'''


def generate_target(instructions, ast):
    teams = {team["id"]: team["name"] for team in ast["teams"]}
    # repr serializes names and instruction values as literals, never Python syntax.
    return ("# Howzat: generated from delivery IR\nimport json\n"
            + "teams = " + repr(teams) + "\n"
            + "instructions = " + repr(instructions) + "\n" + RUNTIME)
