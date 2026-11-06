"""Fold constant arithmetic and propagate values without changing deliveries."""

def optimize(instructions):
    constants, optimized, changes = {}, [], []
    for instruction in instructions:
        item = dict(instruction)
        op = item["op"]
        if op in {"ADD", "MUL"}:
            left = constants.get(item["left"], item["left"])
            right = constants.get(item["right"], item["right"])
            if type(left) is int and type(right) is int:
                value = left + right if op == "ADD" else left * right
                constants[item["target"]] = value
                symbol = "+" if op == "ADD" else "*"
                changes.append(f"{item['target']}: {left} {symbol} {right} = {value}. Substituted the value and removed the temporary assignment.")
                continue
            # Keep unresolved arithmetic intact, but propagate known operands.
            constants.pop(item["target"], None)
            item["left"], item["right"] = left, right
        elif op == "DELIVERY":
            item["value"] = constants.get(item["value"], item["value"])
        optimized.append(item)
    return optimized, changes
