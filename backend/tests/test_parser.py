import json
import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.compiler.errors import CompileError
from backend.compiler.lexer import tokenize
from backend.compiler.parser import parse
from backend.compiler.pipeline import compile_events

TEAMS = 'team IND "India";\nteam AUS "Australia";\n'
def program(deliveries='0, 1, 4, 0, 2, 6'):
    return TEAMS + 'innings IND { over 1 { ' + deliveries + ' } }'
def expression(text):
    return parse(tokenize(program('run(' + text + ')')))[0]['innings'][0]['overs'][0]['deliveries'][0]['value']
def leaves(tree):
    if 'lexeme' in tree:
        yield tree['lexeme']
    for child in tree['children']:
        yield from leaves(child)

class ParserTests(unittest.TestCase):
    def test_simple_program_ast_and_original_tree_tokens(self):
        source = program()
        tokens = tokenize(source)
        ast, tree = parse(tokens)
        self.assertEqual(ast['type'], 'Program')
        self.assertEqual([team['name'] for team in ast['teams']], ['India', 'Australia'])
        innings = ast['innings'][0]
        self.assertEqual((innings['team'], innings['complete']), ('IND', False))
        over = innings['overs'][0]
        self.assertEqual((over['number'], over['partial']), (1, False))
        self.assertEqual([d['value']['value'] for d in over['deliveries']], [0, 1, 4, 0, 2, 6])
        self.assertEqual(list(leaves(tree)), [token['lexeme'] for token in tokens[:-1]])
        self.assertIn('ε', json.dumps(tree, ensure_ascii=False))
        json.dumps({'ast': ast, 'parse_tree': tree})

    def test_multiple_innings_overs_and_optional_flags(self):
        source = TEAMS + 'innings IND complete { over 1 { wicket } over 2 partial { 2 } } innings AUS { over 1 partial { 1 } }'
        ast, _ = parse(tokenize(source))
        self.assertEqual(len(ast['innings']), 2)
        self.assertTrue(ast['innings'][0]['complete'])
        self.assertTrue(ast['innings'][0]['overs'][1]['partial'])
        self.assertFalse(ast['innings'][1]['complete'])

    def test_all_delivery_forms_remain_unevaluated(self):
        ast, _ = parse(tokenize(program('wide, noball, wicket, bye(2), legbye(1), run(2+2)')))
        deliveries = ast['innings'][0]['overs'][0]['deliveries']
        self.assertEqual([d['kind'] for d in deliveries], ['wide', 'noball', 'wicket', 'bye', 'legbye', 'run'])
        self.assertEqual([d['value']['value'] for d in deliveries[:3]], [1, 1, 0])
        self.assertEqual(deliveries[-1]['value']['type'], 'Binary')

    def test_multiplication_precedence(self):
        value = expression('2+3*4')
        self.assertEqual(value['op'], '+')
        self.assertEqual(value['left']['value'], 2)
        self.assertEqual(value['right']['op'], '*')

    def test_parentheses_override_precedence(self):
        value = expression('(2+3)*4')
        self.assertEqual(value['op'], '*')
        self.assertEqual(value['left']['op'], '+')

    def test_repeated_operators_are_left_associative(self):
        for operator in ['+', '*']:
            value = expression(f'1{operator}2{operator}3')
            self.assertEqual(value['op'], operator)
            self.assertEqual(value['left']['op'], operator)
            self.assertEqual(value['right']['value'], 3)

    def test_ast_positions_point_to_names_references_and_operators(self):
        source = program('run(2+3)')
        ast, _ = parse(tokenize(source))
        self.assertEqual(ast['teams'][0]['column'], 6)
        self.assertEqual(ast['teams'][0]['name_location']['column'], 10)
        innings = ast['innings'][0]
        self.assertEqual((innings['line'], innings['column']), (3, 9))
        value = innings['overs'][0]['deliveries'][0]['value']
        line = source.splitlines()[value['line'] - 1]
        self.assertEqual(line[value['column'] - 1:value['end_column'] - 1], '+')

    def test_semantically_invalid_values_are_syntactically_valid(self):
        ast, _ = parse(tokenize('innings UNKNOWN { over 0 { 99, bye(99) } }'))
        self.assertEqual(ast['teams'], [])
        self.assertEqual(ast['innings'][0]['overs'][0]['deliveries'][0]['value']['value'], 99)

    def test_missing_comma_reports_exact_span(self):
        source = TEAMS + 'innings IND {\n  over 1 { 4 2 }\n}'
        with self.assertRaisesRegex(CompileError, 'Missing comma') as caught:
            parse(tokenize(source))
        self.assertEqual((caught.exception.line, caught.exception.column, caught.exception.end_column), (4, 14, 15))

    def test_missing_punctuation_and_operands(self):
        invalid = [
            'team IND "India" innings IND { over 1 { 1 } }',
            program('run(2+)'), program('run()'), program('run(2 3)'),
            program('run(2'), program('1,'), program(',1'),
            TEAMS + 'innings IND { over 1 { 1 }',
            TEAMS + 'innings IND { over 1 { 1 } } team AUS "Australia";',
            TEAMS + 'innings IND { over 1 { 1+2 } }',
        ]
        for source in invalid:
            with self.subTest(source=source), self.assertRaises(CompileError) as caught:
                parse(tokenize(source))
            self.assertGreaterEqual(caught.exception.column, 1)
            self.assertGreater(caught.exception.end_column, caught.exception.column)

    def test_required_innings_over_and_delivery(self):
        for source in ['', '// only comment', TEAMS, TEAMS + 'innings IND {}', TEAMS + 'innings IND { over 1 {} }']:
            with self.subTest(source=source), self.assertRaises(CompileError):
                parse(tokenize(source))

    def test_identifiers_cannot_impersonate_token_types(self):
        for source in [TEAMS + 'innings IND { over NUMBER { 1 } }', program() + ' EOF', program('run(NUMBER)')]:
            with self.subTest(source=source), self.assertRaises(CompileError):
                parse(tokenize(source))

    def test_eof_error_is_at_source_end(self):
        source = 'innings IND {\n over 1 { 1'
        with self.assertRaisesRegex(CompileError, 'end of input') as caught:
            parse(tokenize(source))
        self.assertEqual((caught.exception.line, caught.exception.column), (2, len(source.splitlines()[1]) + 1))

    def test_deep_parentheses_have_a_friendly_error(self):
        with self.assertRaisesRegex(CompileError, 'nesting'):
            expression('(' * 40 + '1' + ')' * 40)

    def test_large_expression_and_list_have_friendly_errors(self):
        for source in [program(','.join(['0'] * 250)), program('run(' + '+'.join(['1'] * 250) + ')')]:
            with self.subTest(source=source[:60]), self.assertRaisesRegex(CompileError, 'deeply nested'):
                parse(tokenize(source))

    def test_syntax_failure_stops_the_pipeline(self):
        events = list(compile_events(program('4 2')))
        failure = next(event for event in events if event['status'] == 'failed')
        self.assertEqual(failure['phase'], 1)
        self.assertIn('Missing comma', failure['error']['message'])
        self.assertEqual([event['phase'] for event in events if event['status'] == 'skipped'], [2, 3, 4, 5])

    def test_api_streams_ast_and_tree(self):
        with TestClient(app) as client:
            self.assertTrue(client.get('/api/health').json()['phases'][1]['available'])
            response = client.post('/api/compile', json={'source': program('run(2+3*4)')})
            events = [json.loads(line) for line in response.text.splitlines()]
            syntax = next(e for e in events if e['phase'] == 1 and e['status'] == 'completed')
            self.assertEqual(syntax['output']['parse_tree']['symbol'], 'Program')
            self.assertEqual(syntax['output']['ast']['teams'][0]['id'], 'IND')

if __name__ == '__main__':
    unittest.main()
