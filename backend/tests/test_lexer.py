import json
import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.language import KEYWORDS
from backend.compiler.errors import CompileError
from backend.compiler.lexer import tokenize
from backend.compiler.pipeline import compile_events


class LexerTests(unittest.TestCase):
    def test_declaration_has_exact_token_types_and_spans(self):
        tokens = tokenize('team IND "India";')
        self.assertEqual([(t['type'], t['lexeme'], t['column'], t['end_column']) for t in tokens], [
            ('KEYWORD', 'team', 1, 5), ('IDENTIFIER', 'IND', 6, 9),
            ('STRING', '"India"', 10, 17), ('SYMBOL', ';', 17, 18), ('EOF', 'EOF', 18, 18)])
        self.assertTrue(all(t['line'] == 1 for t in tokens))

    def test_all_keywords_and_case_sensitive_identifier_boundaries(self):
        words = sorted(KEYWORDS)
        self.assertEqual([t['type'] for t in tokenize(' '.join(words))[:-1]], ['KEYWORD'] * 11)
        tokens = tokenize('team_score team2 Team _team IND_2')
        self.assertTrue(all(t['type'] == 'IDENTIFIER' for t in tokens[:-1]))

    def test_all_symbols_and_expression_tokens(self):
        self.assertEqual([t['lexeme'] for t in tokenize('{}(),;+*')[:-1]], list('{}(),;+*'))
        self.assertEqual([t['lexeme'] for t in tokenize('run(2 + 2 * (3))')[:-1]],
                         ['run', '(', '2', '+', '2', '*', '(', '3', ')', ')'])

    def test_comments_and_whitespace_do_not_emit_tokens(self):
        tokens = tokenize('// opening\n\tteam // inline\n IND')
        self.assertEqual([(t['lexeme'], t['line'], t['column']) for t in tokens],
                         [('team', 2, 2), ('IND', 3, 2), ('EOF', 3, 5)])

    def test_line_endings_are_counted_consistently(self):
        for newline in ['\n', '\r\n', '\r']:
            with self.subTest(newline=repr(newline)):
                tokens = tokenize('team' + newline + '// comment' + newline + '  IND')
                self.assertEqual((tokens[1]['line'], tokens[1]['column']), (3, 3))
                self.assertEqual((tokens[-1]['line'], tokens[-1]['column']), (3, 6))

    def test_strings_preserve_quotes_unicode_and_comment_markers(self):
        for value in ['"India // XI"', '"भारत"', '""']:
            with self.subTest(value=value):
                token = tokenize(value)[0]
                self.assertEqual((token['type'], token['lexeme']), ('STRING', value))
                self.assertEqual(token['end_column'], len(value) + 1)

    def test_six_digit_number_boundary_and_leading_zeroes(self):
        self.assertEqual([t['lexeme'] for t in tokenize('0 000001 999999')[:-1]], ['0', '000001', '999999'])
        with self.assertRaises(CompileError) as caught:
            tokenize('run(1000000)')
        self.assertEqual((caught.exception.line, caught.exception.column, caught.exception.end_column), (1, 5, 12))
        self.assertIn('six digits', str(caught.exception))

    def test_invalid_character_reports_exact_location(self):
        with self.assertRaises(CompileError) as caught:
            tokenize('// comment\n  over 1 { @ }')
        self.assertEqual(caught.exception.as_dict(), {
            'message': "Unexpected character '@'.", 'line': 2, 'column': 12, 'end_column': 13})

    def test_unclosed_string_reports_its_opening_quote(self):
        for source in ['team IND "India', 'team IND "India\n"', 'team IND "India\r\n"']:
            with self.subTest(source=source), self.assertRaisesRegex(CompileError, 'Unclosed string') as caught:
                tokenize(source)
            self.assertEqual((caught.exception.line, caught.exception.column), (1, 10))

    def test_escape_reports_the_backslash(self):
        with self.assertRaisesRegex(CompileError, 'escapes') as caught:
            tokenize('"A\\n"')
        self.assertEqual((caught.exception.column, caught.exception.end_column), (3, 4))

    def test_empty_and_comment_only_source_produce_eof(self):
        for source, line, column in [('', 1, 1), ('// hello', 1, 9), (' \n', 2, 1)]:
            with self.subTest(source=source):
                self.assertEqual(tokenize(source), [{'type': 'EOF', 'lexeme': 'EOF', 'line': line,
                                                     'column': column, 'end_column': column}])

    def test_source_positions_round_trip_to_source(self):
        source = 'team IND "India";\r\n// comment\r\ninnings IND { over 1 {run(2+2), wicket} }'
        lines = source.splitlines()
        for token in tokenize(source)[:-1]:
            self.assertEqual(lines[token['line'] - 1][token['column'] - 1:token['end_column'] - 1], token['lexeme'])

    def test_lexical_failure_stops_later_phases(self):
        events = list(compile_events('@'))
        self.assertEqual([event['status'] for event in events], ['running', 'failed'] + ['skipped'] * 5)
        self.assertEqual(events[1]['error']['column'], 1)

    def test_api_returns_real_tokens_and_lexical_diagnostic(self):
        with TestClient(app) as client:
            self.assertTrue(client.get('/api/health').json()['phases'][0]['available'])
            events = [json.loads(line) for line in client.post('/api/compile', json={'source': 'team IND "India";'}).text.splitlines()]
            self.assertEqual(events[1]['output']['tokens'], tokenize('team IND "India";'))
            events = [json.loads(line) for line in client.post('/api/compile', json={'source': 'wide @'}).text.splitlines()]
            self.assertEqual(events[1]['status'], 'failed')
            self.assertEqual(events[1]['error']['column'], 6)


if __name__ == '__main__':
    unittest.main()
