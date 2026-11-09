import type { LanguageReference } from './types';

const details: Record<string, {example: string; note: string}> = {
  KEYWORD: {example: 'team, over, wicket', note: 'A complete identifier matching a reserved word becomes a KEYWORD.'},
  IDENTIFIER: {example: 'IND, AUS, teamName', note: 'A name starting with an ASCII letter or underscore, followed by letters, digits, or underscores.'},
  NUMBER: {example: '0, 4, 12', note: 'A whole number of at most six digits. Cricket run limits are checked later.'},
  STRING: {example: '"India"', note: 'Double-quoted text without escapes or line breaks.'},
  SYMBOL: {example: '{ } ( ) , ; + *', note: 'Each punctuation mark or operator becomes a separate token.'},
  COMMENT: {example: '// First over', note: 'Continues to the end of the line and does not reach the parser.'},
  SPACE: {example: 'Space or tab', note: 'Updates the source column without emitting a token.'},
  NEWLINE: {example: 'Line break', note: 'Advances the source line and resets the column.'},
  EOF: {example: 'EOF', note: 'Added automatically so the parser can recognize the end of input.'},
};
const meanings: Record<string, string> = {
  team: 'Declare a team and its display name.', innings: 'Start the scoring instructions for a team.',
  complete: 'Mark an innings as finished so the match result can be decided.',
  over: 'Start a numbered over.', partial: 'Mark an unfinished final over.',
  wide: 'Add one extra run without using a legal ball.', noball: 'Add one extra run without using a legal ball.',
  wicket: 'Record a wicket on a legal ball.', run: 'Use a calculation for bat runs.',
  bye: 'Record byes using bye(...).', legbye: 'Record leg-byes using legbye(...).',
};
export function TokenGuide({ keywords, tokens }: Pick<LanguageReference, 'keywords' | 'tokens'>) {
  return <>
    <div className="guide-table token-reference-table"><table><caption className="sr-only">Predefined language token patterns, examples, and lexer behavior</caption><thead><tr><th scope="col">Token type</th><th scope="col">Regex / rule</th><th scope="col">Examples</th><th scope="col">What it means</th></tr></thead><tbody>{tokens.map(token => <tr key={token.type}>
      <td><code>{token.type}</code></td><td><code>{token.pattern}</code></td><td><code>{details[token.type]?.example ?? token.type}</code></td>
      <td><span className="token-action">{token.ignored ? 'Skip' : 'Emit'}</span>{details[token.type]?.note ?? 'Recognized by the lexer.'}</td>
    </tr>)}</tbody></table></div>
    <h3 className="keyword-reference-heading">Reserved keywords</h3>
    <p className="token-guide-note">These {keywords.length} words are case-sensitive and cannot be team identifiers. They all have token type <code>KEYWORD</code>.</p>
    <dl className="keyword-reference">{keywords.map(keyword => <div key={keyword}><dt><code>{keyword}</code></dt><dd>{meanings[keyword] ?? 'Reserved by the language.'}</dd></div>)}</dl>
    <p className="guide-callout"><strong>Matching order matters.</strong> The lexer tries comments, spaces, newlines, strings, numbers, identifiers, then symbols. It checks complete identifiers against the keyword list: <code>teamName</code> is an identifier, while <code>team</code> is a keyword.</p>
    <p className="token-guide-note">Compile a program and open Lexical analysis to see its actual tokens, with their text, line, and column.</p>
  </>;
}
