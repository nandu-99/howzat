import copy
import json
import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.compiler.errors import CompileError
from backend.compiler.lexer import tokenize
from backend.compiler.parser import parse
from backend.compiler.pipeline import compile_events
from backend.compiler.semantic import evaluate, validate

TEAMS = 'team IND "India";\nteam AUS "Australia";\n'
def ast_for(deliveries='0, 1, 4, 0, 2, 6', teams=TEAMS, identifier='IND'):
    ast = parse(tokenize(teams + f'innings {identifier} {{ over 1 {{ ' + deliveries + ' } }'))[0]
    over = ast['innings'][0]['overs'][0]
    over['partial'] = sum(ball['kind'] not in {'wide', 'noball'} for ball in over['deliveries']) < 6
    return ast

class SemanticTests(unittest.TestCase):
    def test_symbols_and_delivery_report(self):
        report = validate(ast_for())
        self.assertEqual(list(report['symbol_table']), ['IND', 'AUS'])
        self.assertEqual(report['symbol_table']['IND'], {
            'kind': 'team', 'name': 'India', 'line': 1, 'column': 6, 'end_column': 9})
        self.assertEqual([row['value'] for row in report['checks']], [0, 1, 4, 0, 2, 6])
        self.assertEqual([row['delivery'] for row in report['checks']], list(range(1, 7)))
        json.dumps(report)

    def test_duplicate_declaration_highlights_second_identifier(self):
        with self.assertRaisesRegex(CompileError, 'declared twice') as caught:
            validate(ast_for(teams='team IND "India";\nteam IND "Other";\n'))
        self.assertEqual((caught.exception.line, caught.exception.column, caught.exception.end_column), (2, 6, 9))

    def test_exactly_two_distinct_teams(self):
        for teams in ['', 'team IND "India";\n', TEAMS + 'team ENG "England";\n']:
            with self.subTest(teams=teams), self.assertRaisesRegex(CompileError, 'exactly two'):
                validate(ast_for(teams=teams))

    def test_empty_team_name_highlights_quoted_string(self):
        for name in ['', '   ', '\t']:
            with self.subTest(name=name), self.assertRaisesRegex(CompileError, 'cannot be empty') as caught:
                validate(ast_for(teams=f'team IND "{name}";\nteam AUS "Australia";\n'))
            self.assertEqual((caught.exception.line, caught.exception.column), (1, 10))
            self.assertEqual(caught.exception.end_column, 12 + len(name))

    def test_identifiers_are_case_sensitive(self):
        with self.assertRaisesRegex(CompileError, 'not been declared') as caught:
            validate(ast_for(identifier='ind'))
        self.assertEqual((caught.exception.line, caught.exception.column, caught.exception.end_column), (3, 9, 12))

    def test_same_display_name_is_allowed_for_distinct_identifiers(self):
        report = validate(ast_for(teams='team IND "Team"; team AUS "Team";'))
        self.assertEqual(len(report['symbol_table']), 2)

    def test_both_innings_references_are_resolved(self):
        source = TEAMS + 'innings IND { over 1 partial { 1 } } innings AUS { over 1 partial { 2 } }'
        report = validate(parse(tokenize(source))[0])
        self.assertEqual([row['team'] for row in report['checks']], ['IND', 'AUS'])

    def test_precedence_and_parentheses_are_evaluated_without_ast_mutation(self):
        ast = ast_for('run(2+2*2), run((1+1)*2), run(1+1+1)')
        original = copy.deepcopy(ast)
        report = validate(ast)
        self.assertEqual([row['value'] for row in report['checks']], [6, 4, 3])
        self.assertEqual(ast, original)
        self.assertIs(report['validated_ast'], ast)
        self.assertEqual(ast['innings'][0]['overs'][0]['deliveries'][0]['value']['type'], 'Binary')

    def test_all_delivery_values_and_source_indices(self):
        report = validate(ast_for('wide, noball, wicket, bye(1), bye(4), legbye(1), legbye(4), run(6)'))
        self.assertEqual([row['value'] for row in report['checks']], [1, 1, 0, 1, 4, 1, 4, 6])
        self.assertEqual(report['checks'][2]['delivery'], 3)
        self.assertEqual(report['checks'][2]['kind'], 'wicket')

    def test_invalid_runs_and_extras_highlight_delivery(self):
        for delivery, message in [('7', 'Bat runs'), ('run(3+4)', 'Bat runs'),
                                  ('bye(0)', 'Byes'), ('legbye(5)', 'Byes')]:
            with self.subTest(delivery=delivery), self.assertRaisesRegex(CompileError, message) as caught:
                validate(ast_for(delivery))
            self.assertEqual((caught.exception.line, caught.exception.column), (3, 24))

    def test_intermediate_limit_is_inclusive_and_checks_every_subexpression(self):
        pos = {'line': 1, 'column': 1, 'end_column': 2}
        def constant(value): return {'type': 'Constant', 'value': value, **pos}
        self.assertEqual(evaluate({'type': 'Binary', 'op': '+', 'left': constant(999999), 'right': constant(1), **pos}), 1000000)
        # Multiplying by zero must not conceal an overflowing inner expression.
        with self.assertRaisesRegex(CompileError, 'intermediate'):
            validate(ast_for('run((999999*2)*0)'))

    def test_overflow_points_to_operator(self):
        ast = ast_for('run(999999*2)')
        expression = ast['innings'][0]['overs'][0]['deliveries'][0]['value']
        with self.assertRaisesRegex(CompileError, 'intermediate') as caught:
            validate(ast)
        self.assertEqual(caught.exception.column, expression['column'])
        self.assertEqual(caught.exception.end_column, expression['end_column'])

    def test_unsupported_expression_and_delivery_shapes_are_rejected(self):
        pos = {'line': 1, 'column': 1, 'end_column': 2}
        for value in [True, -1, 1.5]:
            with self.subTest(value=value), self.assertRaises(CompileError):
                evaluate({'type': 'Constant', 'value': value, **pos})
        ast = ast_for()
        ast['innings'][0]['overs'][0]['deliveries'][0]['kind'] = 'unknown'
        with self.assertRaisesRegex(CompileError, 'Unsupported delivery'):
            validate(ast)

    def test_failure_stops_later_phases(self):
        source = TEAMS + 'innings UNKNOWN { over 1 { 1 } }'
        events = list(compile_events(source))
        failure = next(e for e in events if e['status'] == 'failed')
        self.assertEqual(failure['phase'], 2)
        self.assertEqual(failure['error']['column'], 9)
        self.assertEqual([e['phase'] for e in events if e['status'] == 'skipped'], [3, 4, 5])

    def test_api_returns_symbols_values_and_source_errors(self):
        with TestClient(app) as client:
            self.assertTrue(client.get('/api/health').json()['phases'][2]['available'])
            source = TEAMS + 'innings IND { over 1 { run(2+2), 0, 1, wicket, 2, 6 } }'
            events = [json.loads(line) for line in client.post('/api/compile', json={'source': source}).text.splitlines()]
            report = next(e['output'] for e in events if e['phase'] == 2 and e['status'] == 'completed')
            self.assertEqual(report['checks'][0]['value'], 4)
            source = TEAMS + 'innings IND { over 1 { bye(5) } }'
            events = [json.loads(line) for line in client.post('/api/compile', json={'source': source}).text.splitlines()]
            failure = next(e for e in events if e['status'] == 'failed')
            self.assertEqual((failure['phase'], failure['error']['line']), (2, 3))

if __name__ == '__main__':
    unittest.main()
