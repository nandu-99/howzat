import copy
import json
import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.compiler.lexer import tokenize
from backend.compiler.parser import parse
from backend.compiler.semantic import validate
from backend.compiler.errors import CompileError
from backend.compiler.pipeline import compile_events

TEAMS = 'team IND "India";\nteam AUS "Australia";\n'
DOTS = '0,0,0,0,0,0'
def report(body):
    ast, _ = parse(tokenize(TEAMS + body))
    return validate(ast)
def wickets(count): return ','.join(['wicket'] * count)

class CricketRuleTests(unittest.TestCase):
    def test_extras_are_deliveries_but_not_legal_balls(self):
        result = report('innings IND { over 1 { wide,noball,1,0,4,wicket,2,0 } }')
        self.assertEqual((result['over_checks'][0]['legal_balls'], result['over_checks'][0]['deliveries']), (6, 8))
        self.assertEqual([r['legal'] for r in result['checks'][:3]], [False, False, True])

    def test_full_overs_need_six_legal_balls(self):
        for deliveries in ['1,2', 'wide,noball,0,0,0,0']:
            with self.subTest(deliveries=deliveries), self.assertRaisesRegex(CompileError, 'exactly 6'):
                report('innings IND { over 1 { ' + deliveries + ' } }')

    def test_no_delivery_after_sixth_legal_ball_even_an_extra(self):
        for delivery in ['0', 'wide', 'noball', 'wicket']:
            with self.subTest(delivery=delivery), self.assertRaisesRegex(CompileError, 'sixth legal'):
                report('innings IND { over 1 { ' + DOTS + ',' + delivery + ' } }')

    def test_partial_must_be_last_and_shorter_than_six(self):
        for body, message in [
            ('innings IND { over 1 partial { 1 } over 2 partial { 1 } }', 'Only the final'),
            ('innings IND { over 1 partial { ' + DOTS + ' } }', 'fewer than 6'),
        ]:
            with self.subTest(body=body), self.assertRaisesRegex(CompileError, message): report(body)
        self.assertEqual(report('innings IND { over 1 partial { wide,noball } }')['over_checks'][0]['legal_balls'], 0)

    def test_over_sequence_starts_at_one_and_has_no_gaps_or_duplicates(self):
        for body in ['over 0 { ' + DOTS + ' }', 'over 2 { ' + DOTS + ' }',
                     'over 1 { ' + DOTS + ' } over 3 { ' + DOTS + ' }',
                     'over 1 { ' + DOTS + ' } over 1 { ' + DOTS + ' }']:
            with self.subTest(body=body), self.assertRaisesRegex(CompileError, 'Expected over'):
                report('innings IND { ' + body + ' }')

    def test_duplicate_innings_are_rejected_at_second_reference(self):
        body = 'innings IND { over 1 { ' + DOTS + ' } }\ninnings IND { over 1 { ' + DOTS + ' } }'
        with self.assertRaisesRegex(CompileError, 'already has an innings') as caught: report(body)
        self.assertEqual((caught.exception.line, caught.exception.column), (4, 9))

    def test_ten_wickets_finish_the_innings(self):
        result = report('innings IND { over 1 { ' + wickets(6) + ' } over 2 partial { ' + wickets(4) + ' } }')
        innings = result['innings_checks'][0]
        self.assertEqual((innings['wickets'], innings['legal_balls'], innings['completion_reason']), (10, 10, 'all_out'))
        self.assertTrue(innings['complete'])

    def test_eleventh_wicket_reports_the_offending_token(self):
        body = 'innings IND {\n over 1 { ' + wickets(6) + ' }\n over 2 partial { ' + wickets(5) + ' }\n}'
        source = TEAMS + body
        with self.assertRaisesRegex(CompileError, 'tenth wicket') as caught: report(body)
        line = source.splitlines()[caught.exception.line - 1]
        self.assertEqual(line[caught.exception.column - 1:caught.exception.end_column - 1], 'wicket')
        self.assertEqual(caught.exception.line, 5)
        self.assertEqual(caught.exception.column, line.rindex('wicket') + 1)

    def test_any_delivery_after_all_out_is_rejected(self):
        for delivery in ['wide', '0']:
            with self.subTest(delivery=delivery), self.assertRaisesRegex(CompileError, 'tenth wicket'):
                report('innings IND { over 1 { ' + wickets(6) + ' } over 2 partial { ' + wickets(4) + ',' + delivery + ' } }')

    def test_explicit_completion_and_unfinished_snapshot(self):
        self.assertFalse(report('innings IND { over 1 { ' + DOTS + ' } }')['innings_checks'][0]['complete'])
        check = report('innings IND complete { over 1 partial { 1 } }')['innings_checks'][0]
        self.assertEqual(check['completion_reason'], 'marked_complete')

    def test_chase_target_and_winning_boundary(self):
        body = 'innings IND complete { over 1 { 1,0,0,0,0,0 } } innings AUS { over 1 partial { 4 } }'
        result = report(body)
        chase = result['innings_checks'][1]
        self.assertEqual((chase['target'], chase['runs'], chase['completion_reason']), (2, 4, 'target_reached'))

    def test_extras_can_win_a_chase_and_no_later_delivery_is_allowed(self):
        first = 'innings IND complete { over 1 { ' + DOTS + ' } } '
        chase = report(first + 'innings AUS { over 1 partial { wide } }')['innings_checks'][1]
        self.assertEqual((chase['runs'], chase['legal_balls'], chase['completion_reason']), (1, 0, 'target_reached'))
        for tail in ['0', 'wide', 'wicket']:
            with self.subTest(tail=tail), self.assertRaisesRegex(CompileError, 'already been won'):
                report(first + 'innings AUS { over 1 partial { wide,' + tail + ' } }')

    def test_tied_unfinished_chase_is_still_in_progress(self):
        result = report('innings IND complete { over 1 { 1,0,0,0,0,0 } } innings AUS { over 1 partial { 1 } }')
        self.assertFalse(result['innings_checks'][1]['complete'])
        self.assertEqual(result['innings_checks'][1]['target'], 2)

    def test_unfinished_first_innings_does_not_create_a_confirmed_target(self):
        result = report('innings IND { over 1 { 1,0,0,0,0,0 } } innings AUS { over 1 partial { 4,4 } }')
        self.assertIsNone(result['innings_checks'][1]['target'])
        self.assertFalse(result['innings_checks'][1]['complete'])

    def test_valid_rule_report_does_not_mutate_ast(self):
        ast, _ = parse(tokenize(TEAMS + 'innings IND { over 1 { ' + DOTS + ' } }'))
        before = copy.deepcopy(ast)
        result = validate(ast)
        self.assertEqual(ast, before)
        self.assertIs(result['validated_ast'], ast)
        json.dumps(result)

    def test_rule_failure_stops_translation_and_has_source_span(self):
        events = list(compile_events(TEAMS + 'innings IND { over 1 { 1 } }'))
        failure = next(e for e in events if e['status'] == 'failed')
        self.assertEqual(failure['phase'], 2)
        self.assertEqual(failure['error']['end_column'], failure['error']['column'] + 1)
        self.assertEqual([e['phase'] for e in events if e['status'] == 'skipped'], [3,4,5])

    def test_api_rule_report_matches_executed_scorecard(self):
        source = TEAMS + 'innings IND complete { over 1 { 1,0,0,0,0,0 } } innings AUS { over 1 partial { 4 } }'
        with TestClient(app) as client:
            events = [json.loads(line) for line in client.post('/api/compile', json={'source': source}).text.splitlines()]
            semantic = next(e['output'] for e in events if e['phase'] == 2 and e['status'] == 'completed')
            scorecard = events[-1]['output']['scorecard']
            for check, card in zip(semantic['innings_checks'], scorecard['innings']):
                self.assertEqual((check['runs'], check['wickets'], check['complete']), (card['runs'], card['wickets'], card['complete']))
            self.assertEqual(scorecard['result']['winner'], 'AUS')
