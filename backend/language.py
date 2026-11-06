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
