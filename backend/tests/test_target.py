import unittest
from backend.compiler.lexer import tokenize
from backend.compiler.parser import parse
from backend.compiler.semantic import validate
from backend.compiler.ir import generate_ir
from backend.compiler.target import generate_target
from backend.compiler.execution import execute_target
from backend.compiler.results import match_result

TEAMS = 'team IND "India"; team AUS "Australia"; '
def score(source):
    ast, _ = parse(tokenize(source))
    validate(ast)
    code = generate_target(generate_ir(ast), ast)
    return execute_target(code), code

class TargetTests(unittest.TestCase):
    def test_standalone_program_scores_simple_over(self):
        output, code = score(TEAMS + 'innings IND { over 1 { 0, 1, 4, 0, 2, 6 } }')
        card = output['innings'][0]
        self.assertEqual((card['runs'], card['wickets'], card['overs_display']), (13, 0, '1.0'))
        self.assertEqual(card['run_rate'], 13)
        self.assertFalse(card['complete'])
        self.assertEqual([b['score'] for b in card['history']], ['0/0', '1/0', '5/0', '5/0', '7/0', '13/0'])
        self.assertNotIn('from backend', code)

    def test_arithmetic_temporaries_execute_with_correct_precedence(self):
        output, _ = score(TEAMS + 'innings IND { over 1 { run(2+2*2), run((1+1)*2), 0, 0, 0, 0 } }')
        self.assertEqual(output['innings'][0]['runs'], 10)
        self.assertEqual([b['value'] for b in output['innings'][0]['history'][:2]], [6, 4])

    def test_extras_and_wickets(self):
        output, _ = score(TEAMS + 'innings IND { over 1 { wide, noball, bye(2), legbye(1), wicket, 0, 1, 4 } }')
        card = output['innings'][0]
        self.assertEqual((card['runs'], card['wickets'], card['legal_balls']), (10, 1, 6))
        self.assertEqual(card['extras'], {'wide': 1, 'noball': 1, 'bye': 2, 'legbye': 1})
        self.assertEqual(card['total_extras'], 5)
        self.assertEqual(len(card['history']), 8)
        self.assertEqual(card['overs'][0]['wickets'], 1)
        self.assertFalse(card['history'][0]['legal'])

    def test_zero_legal_balls_has_zero_run_rate(self):
        output, _ = score(TEAMS + 'innings IND { over 1 partial { wide, noball } }')
        card = output['innings'][0]
        self.assertEqual((card['runs'], card['overs_display'], card['run_rate']), (2, '0.0', 0))

    def test_partial_over_and_explicit_completion(self):
        output, _ = score(TEAMS + 'innings IND complete { over 1 { 0, 0, 0, 0, 0, 0 } over 2 partial { 1, wicket } }')
        card = output['innings'][0]
        self.assertEqual((card['runs'], card['wickets'], card['overs_display']), (1, 1, '1.2'))
        self.assertTrue(card['complete'])
        self.assertEqual(card['completion_reason'], 'marked_complete')
        self.assertEqual(card['overs'][1]['runs'], 1)

    def test_all_out_completion(self):
        output, _ = score(TEAMS + 'innings IND { over 1 { ' + ','.join(['wicket'] * 6) + ' } over 2 partial { ' + ','.join(['wicket'] * 4) + ' } }')
        card = output['innings'][0]
        self.assertEqual((card['wickets'], card['overs_display'], card['completion_reason']), (10, '1.4', 'all_out'))
        self.assertTrue(card['complete'])

    def test_two_innings_have_separate_scores_and_runs_result(self):
        output, _ = score(TEAMS + 'innings IND complete { over 1 { 0, 1, 4, 0, 2, 6 } } innings AUS complete { over 1 { 0, 0, wicket, 1, 2, 0 } }')
        self.assertEqual([c['runs'] for c in output['innings']], [13, 3])
        result = match_result(output['innings'], {'IND': 'India', 'AUS': 'Australia'})
        self.assertEqual((result['winner'], result['margin']), ('IND', 10))

    def test_successful_chase_completion(self):
        output, _ = score(TEAMS + 'innings IND complete { over 1 { 1, 0, 0, 0, 0, 0 } } innings AUS { over 1 partial { 4 } }')
        self.assertEqual(output['innings'][1]['completion_reason'], 'target_reached')
        result = match_result(output['innings'], {'IND': 'India', 'AUS': 'Australia'})
        self.assertEqual((result['winner'], result['margin_type']), ('AUS', 'wickets'))

    def test_team_name_is_literal_data(self):
        name = "India'); raise RuntimeError('unexpected'); #"
        source = f'team IND "{name}"; team AUS "Australia"; innings IND {{ over 1 {{ 0, 0, 0, 0, 0, 0 }} }}'
        output, _ = score(source)
        self.assertEqual(output['innings'][0]['name'], name)
