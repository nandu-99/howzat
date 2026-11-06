# Howzat language

Howzat describes team declarations and cricket innings. Keywords are lowercase
and case-sensitive. Team identifiers use ASCII letters, digits, and underscores,
with a letter or underscore first. Strings use double quotes with no escapes or
line breaks. Numbers are unsigned integers of at most six digits.

```text
team IND "India";
team AUS "Australia";

innings IND {
  over 1 { 0, 1, 4, 0, 2, 6 }
}
```

Team declarations end with `;`. Braces enclose innings and overs, and commas
separate deliveries. Bare numbers describe bat runs; `wicket`, `wide`, and
`noball` describe other delivery types. `run(expression)`, `bye(expression)`,
and `legbye(expression)` accept integers, `+`, `*`, and parentheses.
`partial` follows an over number to mark an unfinished over; `complete` follows
an innings team identifier to mark a finished innings. Syntax and cricket-rule
validation are separate from token recognition.

## Lexical rules

| Token | Pattern / values |
|---|---|
| KEYWORD | `team innings complete over partial wide noball wicket bye legbye run` |
| IDENTIFIER | `[A-Za-z_][A-Za-z_0-9]*` |
| NUMBER | `[0-9]+`, maximum six digits |
| STRING | `"[^"\r\n\\]*"` |
| SYMBOL | `[{}(),;+*]` |
| COMMENT | `//[^\r\n]*`, skipped |
| SPACE | `[ \t]+`, skipped |
| NEWLINE | `\r\n|\r|\n`, skipped; advances line |
| EOF | Synthetic end-of-input token |

The scanner matches an entire identifier before checking keyword membership:
`team_score` is one identifier, not a keyword followed by an identifier. Text in
strings is preserved, including quotes and `//`. Comments apply outside strings.
Empty strings are lexically valid; their meaning is checked by semantic analysis.

Tokens retain their original text and have one-based line and column positions.
Columns count source characters; a tab advances one column. End columns are
exclusive. EOF has equal start and end columns. Lexical errors report unexpected
characters, strings with escapes or missing closing quotes, and oversized numbers.

The canonical keyword set and regular expressions live in `backend/language.py`.
