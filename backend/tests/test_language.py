import unittest
from fastapi.testclient import TestClient
from backend.main import app, DIST
from backend.language import EXAMPLES, KEYWORDS, TOKEN_PATTERNS, IGNORED_TOKENS, language_reference
from backend.compiler.lexer import tokenize
from backend.compiler.parser import parse
from backend.compiler.pipeline import compile_events

class LanguageTests(unittest.TestCase):
    def test_exactly_five_correct_and_three_distinct_error_phases(self):
        self.assertEqual(len(EXAMPLES), 8)
        self.assertEqual(len({e['id'] for e in EXAMPLES}), 8)
        self.assertEqual(sum(e['group'] == 'Correct examples' for e in EXAMPLES), 5)
        self.assertEqual(sorted(e['failure_phase'] for e in EXAMPLES if 'failure_phase' in e), [0,1,2])

    def test_correct_examples_have_documented_scores(self):
        expected = {'simple': (13,0,'1.0'), 'extras': (16,0,'1.0'), 'wickets': (13,3,'1.2'),
                    'optimization': (14,0,'1.0'), 'multiple': (21,1,'2.0')}
        for example in EXAMPLES:
            if example['id'] not in expected: continue
            with self.subTest(example=example['id']):
                events = list(compile_events(example['source']))
                self.assertEqual([e['phase'] for e in events if e['status'] == 'completed'], list(range(6)))
                score = events[-1]['output']['scorecard']
                card = score['innings'][0]
                self.assertEqual((card['runs'], card['wickets'], card['overs_display']), expected[example['id']])
                if example['id'] == 'extras': self.assertEqual(card['total_extras'], 5)
                if example['id'] == 'optimization':
                    optimization = next(e['output'] for e in events if e['phase'] == 4 and e['status'] == 'completed')
                    self.assertEqual(optimization['before_count'] - optimization['after_count'], 3)
                if example['id'] == 'multiple':
                    self.assertEqual((score['result']['winner'], score['result']['margin']), ('IND',3))
                    self.assertEqual(score['innings'][1]['runs'],18)

    def test_errors_fail_in_documented_phases_and_fixes_compile(self):
        for example in EXAMPLES:
            if 'failure_phase' not in example: continue
            with self.subTest(example=example['id']):
                events = list(compile_events(example['source']))
                failure = next(e for e in events if e['status'] == 'failed')
                self.assertEqual(failure['phase'], example['failure_phase'])
                self.assertFalse(any(e['phase'] == 5 and e['status'] == 'completed' for e in events))
                fixed = list(compile_events(example['fixed_source']))
                self.assertEqual(fixed[-1]['status'], 'completed')
                card = fixed[-1]['output']['scorecard']['innings'][0]
                self.assertEqual((card['runs'],card['wickets']), (0,10) if example['id'] == 'too-many-wickets' else (13,0))

    def test_reference_patterns_match_the_lexer_definition(self):
        reference = language_reference()
        self.assertEqual(reference['keywords'], sorted(KEYWORDS))
        self.assertEqual(len(reference['tokens']),9)
        patterns = {t['type']:t for t in reference['tokens']}
        for kind, pattern in TOKEN_PATTERNS:
            self.assertEqual(patterns[kind]['pattern'],pattern)
            self.assertEqual(patterns[kind]['ignored'],kind in IGNORED_TOKENS)

    def test_reference_structures_come_from_actual_parser(self):
        reference = language_reference()
        self.assertEqual(len(reference['samples']),3)
        for sample in reference['samples']:
            ast, tree = parse(tokenize(sample['source']))
            self.assertEqual(sample['ast'],ast)
            self.assertEqual(sample['parse_tree'],tree)
            self.assertEqual(sample['derivation'][0],'Over')
            self.assertIn('Innings',reference['grammar'])

    def test_endpoints_and_built_guide_route(self):
        with TestClient(app) as client:
            self.assertEqual(client.get('/api/examples').json(), EXAMPLES)
            self.assertEqual(client.get('/api/language').json(), language_reference())
            if DIST.exists():
                response = client.get('/language')
                self.assertEqual(response.status_code,200)
                self.assertIn('<div id="root">',response.text)
