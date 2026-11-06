"""Lower the AST to ordered three-address instructions without folding constants."""
from .errors import error_at

def generate_ir(ast):
    instructions, counter = [], 0

    def expression(expr):
        nonlocal counter
        if expr["type"] == "Constant":
            return expr["value"]
        if expr["type"] != "Binary" or expr["op"] not in {"+", "*"}:
            raise error_at("Cannot translate this expression into intermediate code.", expr)
        left, right = expression(expr["left"]), expression(expr["right"])
        counter += 1
        target = f"t{counter}"
        instructions.append({"op": "ADD" if expr["op"] == "+" else "MUL", "target": target, "left": left, "right": right})
        return target

    for innings in ast["innings"]:
        instructions.append({"op": "INNINGS", "team": innings["team"], "complete": innings.get("complete", False)})
        for over in innings["overs"]:
            instructions.append({"op": "OVER", "number": over["number"], "partial": over["partial"]})
            for ball in over["deliveries"]:
                value = expression(ball["value"])
                instructions.append({"op": "DELIVERY", "kind": ball["kind"], "value": value, "line": ball["line"], "column": ball["column"], "end_column": ball["end_column"]})
        instructions.append({"op": "END_INNINGS"})
    return instructions

def format_ir(instructions):
    lines = []
    for i in instructions:
        if i["op"] in {"ADD", "MUL"}:
            lines.append(f"{i['target']} = {i['left']} {'+' if i['op'] == 'ADD' else '*'} {i['right']}")
        elif i["op"] == "DELIVERY":
            lines.append(f"  EMIT_DELIVERY {i['kind']}, {i['value']}")
        elif i["op"] == "INNINGS":
            lines.append(f"BEGIN_INNINGS {i['team']}" + (" COMPLETE" if i.get("complete") else ""))
        elif i["op"] == "OVER":
            lines.append(f"BEGIN_OVER {i['number']}" + (" PARTIAL" if i["partial"] else ""))
        elif i["op"] == "END_INNINGS":
            lines.append("END_INNINGS")
        else:
            raise ValueError(f"Unknown IR operation: {i['op']}")
    return "\n".join(lines)
