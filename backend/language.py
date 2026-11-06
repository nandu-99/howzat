"""Lexical definition of the Howzat language.

Patterns are ordered: comments precede '/', and complete identifiers are matched
before keyword lookup. The parser is responsible for grammar, not the lexer.
"""
KEYWORDS = frozenset({
    "team", "innings", "complete", "over", "partial", "wide", "noball",
    "wicket", "bye", "legbye", "run",
})
MAX_NUMBER_DIGITS = 6
TOKEN_PATTERNS = (
    ("COMMENT", r"//[^\r\n]*"),
    ("SPACE", r"[ \t]+"),
    ("NEWLINE", r"\r\n|\r|\n"),
    ("STRING", r'"[^"\r\n\\]*"'),
    ("NUMBER", r"[0-9]+"),
    ("IDENTIFIER", r"[A-Za-z_][A-Za-z_0-9]*"),
    ("SYMBOL", r"[{}(),;+*]"),
)
IGNORED_TOKENS = frozenset({"COMMENT", "SPACE", "NEWLINE"})


HEADER = 'team IND "India";\nteam AUS "Australia";\n\n'
EXAMPLES = [
    {
        "id": "simple", "name": "1. Start here: one over",
        "description": "India bats for six balls. Each number is the runs scored on one ball; 0 means no runs.",
        "expected": "13 runs, 0 wickets, 1.0 overs. All six phases pass; the innings is still in progress.",
        "source": HEADER + '// India bats for one over.\ninnings IND {\n  over 1 {\n    0, 1, 4, 0, 2, 6\n  }\n}\n// Total: 0 + 1 + 4 + 0 + 2 + 6 = 13'
    },
    {
        "id": "extras", "name": "2. Add wides and no-balls",
        "description": "There are eight deliveries, but the wide and no-ball do not count toward the six legal balls.",
        "expected": "16 runs, 0 wickets, 1.0 overs. Includes 5 extras.",
        "source": HEADER + 'innings IND {\n  over 1 {\n    1, wide, 4, noball,\n    bye(2), legbye(1), 0, 6\n  }\n}\n// wide and noball: 1 run each\n// bye(2) and legbye(1): 3 extras\n// Six legal balls, eight deliveries'
    },
    {
        "id": "wickets", "name": "3. Take wickets and stop early",
        "description": "A wicket counts as a legal ball. Use partial when the final over is unfinished.",
        "expected": "13 runs, 3 wickets, 1.2 overs. This is an unfinished scoring snapshot.",
        "source": HEADER + 'innings IND {\n  // Six legal balls, two wickets\n  over 1 {\n    1, wicket, 4, wicket, 0, 6\n  }\n  // Stop after two more balls\n  over 2 partial { wicket, 2 }\n}'
    },
    {
        "id": "optimization", "name": "4. See code simplification",
        "description": "Write simple calculations for runs. The compiler works them out before generating Python.",
        "expected": "14 runs, 0 wickets, 1.0 overs. Phase 5 removes three calculations.",
        "source": HEADER + 'innings IND {\n  over 1 {\n    run(2 + 2), 0,\n    run(2 * 3), 2,\n    run(1 + 1), 0\n  }\n}\n// The same six balls after simplification:\n// 4, 0, 6, 2, 2, 0'
    },
    {
        "id": "multiple", "name": "5. Score a completed match",
        "description": "Record a finished two-over match. Use complete to mark each innings as finished.",
        "expected": "India: 21/1. Australia: 18/1. India win by 3 runs.",
        "source": HEADER + '// India finish on 21. Target: 22.\ninnings IND complete {\n  over 1 { 1, 0, 4, 2, 0, 6 }\n  over 2 { 0, 1, 1, 4, wicket, 2 }\n}\n\n// Australia finish on 18.\ninnings AUS complete {\n  over 1 { 4, 0, 1, 0, 2, 6 }\n  over 2 { 1, 4, wicket, 0, 0, 0 }\n}\n// India win by 3 runs.'
    },
    {
        "id": "invalid-syntax", "name": "6. Find a missing comma",
        "description": "This example has a deliberate mistake: there is no comma between 4 and 2.",
        "expected": "Phase 1 passes. Phase 2 fails. Phases 3 to 6 do not run.",
        "fix": "Change 4 2 to 4, 2, then compile again. The result will be 13 runs.",
        "source": HEADER + 'innings IND {\n  over 1 {\n    1, 0, 4 2, 0, 6\n  }\n}\n// Missing comma between 4 and 2'
    },
    {
        "id": "too-many-wickets", "name": "8. Try to take 11 wickets",
        "description": "Over 1 has six wickets. Over 2 tries to add five more, making 11. An innings must stop at ten wickets.",
        "failure_phase": 2,
        "expected": "Phases 1 and 2 pass. Phase 3 rejects the eleventh wicket. Phases 4 to 6 do not run; no scorecard is produced.",
        "fix": "Remove the last wicket from over 2. The corrected innings ends at 0/10 in 1.4 overs.",
        "source": HEADER + 'innings IND {\n  // Six legal balls: wickets 1 to 6\n  over 1 {\n    wicket, wicket, wicket,\n    wicket, wicket, wicket\n  }\n  // Five more wickets would make 11.\n  over 2 partial {\n    wicket, wicket, wicket, wicket,\n    wicket\n  }\n}',
        "fixed_source": HEADER + 'innings IND {\n  // Six legal balls: wickets 1 to 6\n  over 1 {\n    wicket, wicket, wicket,\n    wicket, wicket, wicket\n  }\n  // Four more wickets: stop at ten.\n  over 2 partial {\n    wicket, wicket, wicket, wicket\n  }\n}'
    }
]

# Keep one error for each of the first three compiler phases.
EXAMPLES.insert(5, {
    "id": "invalid-character", "name": "6. Find an unknown character",
    "description": "The @ character is not part of Howzat.",
    "expected": "Phase 1 fails. Phases 2 to 6 do not run.",
    "failure_phase": 0,
    "source": HEADER + 'innings IND {\n  over 1 { 0, 1, @, 0, 2, 6 }\n}',
    "fixed_source": HEADER + 'innings IND {\n  over 1 { 0, 1, 4, 0, 2, 6 }\n}',
    "fix": "Replace @ with 4. The corrected score is 13 runs.",
})

for example in EXAMPLES:
    if example["id"] == "invalid-syntax":
        example["name"] = "7. Find a missing comma"
        example["failure_phase"] = 1
        example["fixed_source"] = example["source"].replace("4 2", "4, 2")
    example["group"] = "Errors" if "failure_phase" in example else "Correct examples"

GRAMMAR = '''Program        → Teams InningsList
Teams          → Team Teams | ε
Team           → team Identifier String ;
InningsList    → Innings MoreInnings
MoreInnings    → Innings MoreInnings | ε
Innings        → innings Identifier Completion { Overs }
Completion     → complete | ε
Overs          → Over MoreOvers
MoreOvers      → Over MoreOvers | ε
Over           → over Number Partial { Deliveries }
Partial        → partial | ε
Deliveries     → Delivery MoreDeliveries
MoreDeliveries → , Delivery MoreDeliveries | ε
Delivery       → Number | wide | noball | wicket
               | run ( Expr ) | bye ( Expr ) | legbye ( Expr )
Expr           → Term ExprTail
ExprTail       → + Term ExprTail | ε
Term           → Factor TermTail
TermTail       → * Factor TermTail | ε
Factor         → Number | ( Expr )
Identifier     → IDENTIFIER
String         → STRING
Number         → NUMBER'''

RULES = [
    {"title": "Declare two teams", "text": 'Start with exactly two distinct team identifiers and quoted, nonempty names. Example: team IND "India"; Team names may contain Unicode; identifiers use ASCII letters, digits, and underscores and cannot start with a digit.'},
    {"title": "One innings per team", "text": "An innings references a declared team. Record one or both teams, at most once each. Every innings contains at least one over."},
    {"title": "Finish an innings and decide the result", "text": "Write innings IND complete { ... } to confirm that innings is finished. Ten wickets also end an innings automatically. A full over alone does not end an innings. After a finished first innings, the target is its score plus one. The chasing team wins as soon as it reaches the target; no further deliveries may follow. Otherwise, a winner or tie is shown only after the second innings is also finished. Unfinished chases show the runs still needed."},
    {"title": "Count legal balls", "text": "Numbers, runs, wickets, byes, and leg-byes each count as one legal delivery. Wides and no-balls do not. A completed over contains exactly six legal deliveries and ends immediately at the sixth."},
    {"title": "Keep overs in order", "text": "Over numbers start at 1 and increase by 1 in each innings. Use partial only on the final over, with fewer than six legal balls. It must still contain at least one delivery."},
    {"title": "Track runs and extras", "text": "Bat runs are 0 through 6. A wide or no-ball adds exactly one extra run. bye(expr) and legbye(expr) add 1 through 4 extras and no bat runs. The language does not combine bat runs or wickets with a wide or no-ball."},
    {"title": "Stop at ten wickets", "text": "wicket adds one wicket and no runs. No delivery may follow the tenth wicket. An innings ending mid-over must mark that over partial, including when all out."},
    {"title": "Expressions and comments", "text": "Use +, *, and parentheses inside run(...), bye(...), and legbye(...). Multiplication has higher precedence. Both operators associate to the left. // starts a line comment. Keywords are case-sensitive; whitespace is ignored."},
    {"title": "Language boundaries", "text": "This scorer supports one innings per team, chase targets, wins, and ties. Player statistics, dismissal types, powerplays, rain-adjusted targets, and super overs are outside the language. Strings do not allow escape sequences. Input is limited to 50,000 characters; numbers to six digits and expressions to intermediate values of 1,000,000."}
]

def tree_text(tree, prefix="", last=True, root=True):
    line = ("" if root else prefix + ("└─ " if last else "├─ ")) + tree["symbol"]
    lines = [line]
    next_prefix = "" if root else prefix + ("   " if last else "│  ")
    for i, child in enumerate(tree["children"]):
        lines.extend(tree_text(child, next_prefix, i == len(tree["children"]) - 1, False))
    return lines

def leftmost_derivation(tree):
    # Expand the actual parser-produced tree, always the leftmost nonterminal.
    frontier, steps = [tree], [tree["symbol"]]
    for _ in range(400):
        index = next((i for i, item in enumerate(frontier) if item["children"]), None)
        if index is None:
            break
        item = frontier[index]
        frontier[index:index + 1] = [child for child in item["children"] if child["symbol"] != "ε"]
        steps.append(" ".join(item["symbol"] for item in frontier))
    return steps

def language_reference():
    from .compiler.lexer import tokenize
    from .compiler.parser import parse
    samples = []
    for example in [item for item in EXAMPLES if item["id"] in {"simple", "extras", "optimization"}]:
        ast, tree = parse(tokenize(example["source"]))
        # An over subtree keeps the concrete parse tree readable while retaining
        # all punctuation, terminals, and epsilon productions.
        innings_tree = tree["children"][1]["children"][0]
        over_tree = next(child for child in innings_tree["children"] if child["symbol"] == "Overs")["children"][0]
        samples.append({**example, "ast": ast, "parse_tree": tree, "tree": "\n".join(tree_text(over_tree)), "derivation": leftmost_derivation(over_tree)})
    tokens = [{"type": name, "pattern": pattern, "ignored": name in IGNORED_TOKENS}
              for name, pattern in TOKEN_PATTERNS]
    tokens.insert(0, {"type": "KEYWORD", "pattern": "Identifier matched against the keyword set", "ignored": False})
    tokens.append({"type": "EOF", "pattern": "End of input (synthetic)", "ignored": False})
    return {"grammar": GRAMMAR, "rules": RULES, "samples": samples,
            "tokens": tokens, "keywords": sorted(KEYWORDS)}
