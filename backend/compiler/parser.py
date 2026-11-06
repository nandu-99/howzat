"""Recursive-descent parser producing a concrete parse tree and a compact AST.

Expression levels enforce multiplication before addition; loops build
left-associative ASTs. Cricket-rule validation is separate from parsing.
"""
from .errors import CompileError

def node(symbol, *children):
    return {"symbol": symbol, "children": list(children)}

def location(token):
    return {"line": token["line"], "column": token["column"], "end_column": token.get("end_column", token["column"] + len(token["lexeme"]))}

class Parser:
    def __init__(self, tokens):
        self.tokens, self.index = tokens, 0
        self.nesting = 0

    @property
    def current(self):
        return self.tokens[self.index]

    def error(self, message, token=None):
        token = self.current if token is None else token
        return CompileError(message, token["line"], token["column"],
                            max(token["column"] + 1, location(token)["end_column"]))

    def take(self, expected):
        token = self.current
        actual = token["type"] if expected in {"IDENTIFIER", "STRING", "NUMBER", "EOF"} else token["lexeme"]
        if actual != expected:
            found = "end of input" if token["type"] == "EOF" else repr(token["lexeme"])
            raise self.error(f"Expected {expected!r}, found {found}.", token)
        self.index += 1
        return token, {**node(token["lexeme"]), "lexeme": token["lexeme"], "token_type": token["type"], **location(token)}

    def parse(self):
        teams, innings, team_trees, innings_trees = [], [], [], []
        while self.current["lexeme"] == "team":
            _, keyword = self.take("team")
            ident, ident_tree = self.take("IDENTIFIER")
            name, name_tree = self.take("STRING")
            _, semi = self.take(";")
            teams.append({"type": "Team", "id": ident["lexeme"], "name": name["lexeme"][1:-1], "name_location": location(name), **location(ident)})
            team_trees.append(node("Team", keyword, node("Identifier", ident_tree), node("String", name_tree), semi))
        while self.current["lexeme"] == "innings":
            value, tree = self.innings()
            innings.append(value)
            innings_trees.append(tree)
        if not innings:
            raise self.error("Expected an innings after the team declarations.")
        self.take("EOF")
        def chain(symbol, values):
            result = node(symbol, node("ε"))
            for value in reversed(values):
                result = node(symbol, value, result)
            return result
        tree = node("Program", chain("Teams", team_trees), node("InningsList", innings_trees[0], chain("MoreInnings", innings_trees[1:])))
        ast = {"type": "Program", "teams": teams, "innings": innings}
        self.check_depth(ast)
        self.check_depth(tree)
        return ast, tree

    def check_depth(self, value):
        # Keep returned JSON safe to serialize and render, including list tails.
        pending = [(value, 0)]
        while pending:
            item, depth = pending.pop()
            if depth > 200:
                raise self.error("Program structure is too deeply nested. Use shorter expressions or fewer items per block.", self.tokens[-1])
            children = item.values() if isinstance(item, dict) else item if isinstance(item, list) else ()
            pending.extend((child, depth + 1) for child in children if isinstance(child, (dict, list)))

    def innings(self):
        _, kw = self.take("innings")
        team, ident = self.take("IDENTIFIER")
        complete = self.current["lexeme"] == "complete"
        completion = node("Completion", self.take("complete")[1] if complete else node("ε"))
        _, left = self.take("{")
        overs, trees = [], []
        while self.current["lexeme"] == "over":
            value, tree = self.over()
            overs.append(value)
            trees.append(tree)
        if not overs:
            raise self.error("An innings needs at least one over.")
        _, right = self.take("}")
        rest = node("MoreOvers", node("ε"))
        for tree in reversed(trees[1:]):
            rest = node("MoreOvers", tree, rest)
        return {"type": "Innings", "team": team["lexeme"], "complete": complete, "overs": overs, **location(team)}, node("Innings", kw, node("Identifier", ident), completion, left, node("Overs", trees[0], rest), right)

    def over(self):
        _, kw = self.take("over")
        number, number_tree = self.take("NUMBER")
        partial = self.current["lexeme"] == "partial"
        flag = node("Partial", self.take("partial")[1] if partial else node("ε"))
        _, left = self.take("{")
        deliveries, trees = [], []
        value, tree = self.delivery()
        deliveries.append(value)
        trees.append(tree)
        separators = []
        while self.current["lexeme"] == ",":
            separators.append(self.take(",")[1])
            value, tree = self.delivery()
            deliveries.append(value)
            trees.append(tree)
            if len(deliveries) > 2000:
                raise self.error("An over may contain at most 2,000 deliveries.", number)
        token = self.current
        if token["type"] == "NUMBER" or token["lexeme"] in {"wide", "noball", "wicket", "run", "bye", "legbye"}:
            raise self.error(f"Missing comma before {token['lexeme']!r}. Separate deliveries with ','.", token)
        _, right = self.take("}")
        rest = node("MoreDeliveries", node("ε"))
        for index in reversed(range(1, len(trees))):
            rest = node("MoreDeliveries", separators[index - 1], trees[index], rest)
        return {"type": "Over", "number": int(number["lexeme"]), "partial": partial, "deliveries": deliveries, **location(number)}, node("Over", kw, node("Number", number_tree), flag, left, node("Deliveries", trees[0], rest), right)

    def delivery(self):
        token = self.current
        kind = token["lexeme"]
        if token["type"] == "NUMBER":
            value, tree = self.take("NUMBER")
            return {"type": "Delivery", "kind": "run", "value": {"type": "Constant", "value": int(value["lexeme"]), **location(value)}, **location(token)}, node("Delivery", node("Number", tree))
        if kind in {"wide", "noball", "wicket"}:
            _, tree = self.take(kind)
            return {"type": "Delivery", "kind": kind, "value": {"type": "Constant", "value": 1 if kind != "wicket" else 0, **location(token)}, **location(token)}, node("Delivery", tree)
        if kind in {"run", "bye", "legbye"}:
            _, kw = self.take(kind)
            _, left = self.take("(")
            value, expr_tree = self.expression()
            _, right = self.take(")")
            return {"type": "Delivery", "kind": kind, "value": value, **location(token)}, node("Delivery", kw, left, expr_tree, right)
        raise self.error("Expected a delivery: a number, run(...), wide, noball, wicket, bye(...) or legbye(...).", token)

    def expression(self):
        value, tree = self.term()
        terms, operations = [tree], []
        while self.current["lexeme"] == "+":
            operator, operator_tree = self.take("+")
            operations.append(operator_tree)
            rhs, child = self.term()
            value = {"type": "Binary", "op": "+", "left": value, "right": rhs, **location(operator)}
            terms.append(child)
        rest = node("ExprTail", node("ε"))
        for i in reversed(range(1, len(terms))):
            rest = node("ExprTail", operations[i - 1], terms[i], rest)
        return value, node("Expr", terms[0], rest)

    def term(self):
        value, tree = self.factor()
        terms, operations = [tree], []
        while self.current["lexeme"] == "*":
            operator, operator_tree = self.take("*")
            operations.append(operator_tree)
            rhs, child = self.factor()
            value = {"type": "Binary", "op": "*", "left": value, "right": rhs, **location(operator)}
            terms.append(child)
        rest = node("TermTail", node("ε"))
        for i in reversed(range(1, len(terms))):
            rest = node("TermTail", operations[i - 1], terms[i], rest)
        return value, node("Term", terms[0], rest)

    def factor(self):
        if self.current["lexeme"] == "(":
            if self.nesting >= 32:
                raise self.error("Expression nesting is too deep. Use fewer parentheses.")
            self.nesting += 1
            _, left = self.take("(")
            value, tree = self.expression()
            _, right = self.take(")")
            self.nesting -= 1
            return value, node("Factor", left, tree, right)
        value, tree = self.take("NUMBER")
        return {"type": "Constant", "value": int(value["lexeme"]), **location(value)}, node("Factor", node("Number", tree))

def parse(tokens):
    return Parser(tokens).parse()
