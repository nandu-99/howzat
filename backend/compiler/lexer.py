"""Scan source left to right into positioned tokens for syntax analysis."""
import re
from ..language import IGNORED_TOKENS, KEYWORDS, MAX_NUMBER_DIGITS, TOKEN_PATTERNS
from .errors import CompileError

PATTERN = re.compile("|".join(f"(?P<{name}>{pattern})" for name, pattern in TOKEN_PATTERNS))


def string_error(source, start, line, column):
    """Distinguish unsupported escapes from a missing closing quote."""
    end = start + 1
    while end < len(source) and source[end] not in '\r\n':
        if source[end] == "\\":
            offset = end - start
            return CompileError("String escapes are not supported. Use plain text inside quotes.",
                                line, column + offset, column + offset + 1)
        end += 1
    return CompileError("Unclosed string. Add a closing double quote on the same line.",
                        line, column, column + max(1, end - start))


def tokenize(source):
    tokens = []
    position, line, column = 0, 1, 1
    while position < len(source):
        match = PATTERN.match(source, position)
        if match is None:
            if source[position] == '"':
                raise string_error(source, position, line, column)
            raise CompileError(f"Unexpected character {source[position]!r}.", line, column, column + 1)
        kind, value = match.lastgroup, match.group()
        if kind == "NEWLINE":
            line, column = line + 1, 1
        else:
            end_column = column + len(value)
            if kind not in IGNORED_TOKENS:
                if kind == "IDENTIFIER" and value in KEYWORDS:
                    kind = "KEYWORD"
                if kind == "NUMBER" and len(value) > MAX_NUMBER_DIGITS:
                    raise CompileError("Numbers may have at most six digits.", line, column, end_column)
                tokens.append({"type": kind, "lexeme": value, "line": line,
                               "column": column, "end_column": end_column})
            column = end_column
        position = match.end()
    tokens.append({"type": "EOF", "lexeme": "EOF", "line": line,
                   "column": column, "end_column": column})
    return tokens
