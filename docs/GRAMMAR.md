# Howzat grammar and syntax structures

The parser uses recursive descent. Quoted words below are literal tokens;
Identifier, Number, and String refer to lexer token types. The lexer supplies EOF.

## Context-free grammar

```text
Program        -> Teams InningsList
Teams          -> Team Teams | ε
Team           -> 'team' Identifier String ';'
InningsList    -> Innings MoreInnings
MoreInnings    -> Innings MoreInnings | ε
Innings        -> 'innings' Identifier Completion '{' Overs '}'
Completion     -> 'complete' | ε
Overs          -> Over MoreOvers
MoreOvers      -> Over MoreOvers | ε
Over           -> 'over' Number Partial '{' Deliveries '}'
Partial        -> 'partial' | ε
Deliveries     -> Delivery MoreDeliveries
MoreDeliveries -> ',' Delivery MoreDeliveries | ε
Delivery       -> Number | 'wide' | 'noball' | 'wicket'
               | 'run' '(' Expr ')' | 'bye' '(' Expr ')' | 'legbye' '(' Expr ')'
Expr           -> Term ExprTail
ExprTail       -> '+' Term ExprTail | ε
Term           -> Factor TermTail
TermTail       -> '*' Factor TermTail | ε
Factor         -> Number | '(' Expr ')'
```

An innings contains at least one over and an over at least one delivery. Team
declarations must precede innings. Exactly two teams, valid references, six-ball
overs, delivery run limits, and wicket limits are semantic checks, not grammar.

Multiplication binds more tightly than addition. Parentheses override precedence.
Repeated operators associate left in the AST: `1 + 2 + 3` becomes `(1 + 2) + 3`.
The right-recursive grammar tails are consumed by loops, without evaluating values.

## AST contract

`parse(tokens)` returns `(ast, parse_tree)`. The root AST is:

```text
Program { teams: Team[], innings: Innings[] }
Team { id, name, name_location }
Innings { team, complete, overs: Over[] }
Over { number, partial, deliveries: Delivery[] }
Delivery { kind, value: Constant | Binary }
Constant { value }
Binary { op, left, right }
```

Every AST node has a `type` field. Every node except Program also has one-based
`line`, `column`, and exclusive `end_column`. Team positions point to identifiers,
Innings to team references, Over to its number, Delivery to its number or keyword,
and Binary to its operator. `name_location` points to the quoted team name.

Bare deliveries become `kind: "run"` with a Constant. `wide` and `noball` carry
constant 1; `wicket` carries constant 0. These are representations, not evaluated
scores. Arithmetic expressions remain intact for validation and translation.
`complete` and `partial` are booleans, defaulting to false.

## Concrete parse tree

Nonterminals use `{symbol, children}` and preserve the productions above, including
punctuation and explicit ε leaves. Token leaves also include `lexeme`, `token_type`,
and source positions. Comments and whitespace were removed by the lexer.

For `run(2 + 3 * 4)`, the AST is a Binary `+` with Constant 2 on its left and a
Binary `*` (3 and 4) on its right. The concrete tree also retains `run`, parentheses,
Expr/Term/Factor nodes, and empty grammar tails.

## Syntax diagnostics

Errors report the unexpected token's full source span. EOF errors point to the
end of the source. Missing delivery commas get a specific message. Missing
semicolons, braces, parentheses, and operands identify the expected token.

Nested parentheses are limited to 32 levels. Returned structure depth is bounded
to keep JSON serialization and display safe; overly long grammar lists or
expressions produce a source diagnostic instead of an internal recursion error.
