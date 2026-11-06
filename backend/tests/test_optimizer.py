import copy
import json
import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.compiler.lexer import tokenize
from backend.compiler.parser import parse
from backend.compiler.semantic import validate
from backend.compiler.ir import generate_ir
from backend.compiler.optimizer import optimize
from backend.compiler.target import generate_target
from backend.compiler.execution import execute_target
from backend.compiler.pipeline import compile_events

TEAMS = 'team IND "India"; team AUS "Australia"; '
def translated(deliveries):
    ast, _ = parse(tokenize(TEAMS + 'innings IND { over 1 { ' + deliveries + ' } }'))
    validate(ast)
    return ast, generate_ir(ast)

class OptimizerTests(unittest.TestCase):
    def test_folding_and_propagation_remove_dependent_temporaries(self):
        ast, original = translated('run(2+2*2), 0, 1, 0, 2, 4')
        optimized, changes = optimize(original)
        self.assertEqual(len(original) - len(optimized), 2)
        self.assertFalse(any(i['op'] in {'ADD', 'MUL'} for i in optimized))
        self.assertEqual(next(i['value'] for i in optimized if i['op'] == 'DELIVERY'), 6)
        self.assertEqual(len(changes), 2)
        self.assertIn('t2: 2 + 4 = 6', changes[1])

    def test_input_is_not_mutated_and_metadata_is_preserved(self):
        ast, ir = translated('run(1+1), wicket, wide, noball, bye(2), legbye(1), 0, 0')
        original = copy.deepcopy(ir)
        optimized, _ = optimize(ir)
        self.assertEqual(ir, original)
        for before, after in zip([i for i in ir if i['op'] == 'DELIVERY'], [i for i in optimized if i['op'] == 'DELIVERY']):
            self.assertEqual({k:v for k,v in before.items() if k != 'value'}, {k:v for k,v in after.items() if k != 'value'})
        self.assertEqual([i for i in ir if i['op'] in {'INNINGS', 'OVER', 'END_INNINGS'}],
                         [i for i in optimized if i['op'] in {'INNINGS', 'OVER', 'END_INNINGS'}])

    def test_numeric_program_is_unchanged(self):
        _, ir = translated('0, 1, 4, wicket, 2, 6')
        optimized, changes = optimize(ir)
        self.assertEqual(optimized, ir)
        self.assertEqual(changes, [])
        self.assertIsNot(optimized[0], ir[0])

    def test_zero_run_deliveries_and_wickets_are_never_removed(self):
        _, ir = translated('run(0*6), wicket, 0, 0, 0, 0')
        optimized, _ = optimize(ir)
        self.assertEqual(len([i for i in optimized if i['op'] == 'DELIVERY']), 6)
        self.assertEqual([i['kind'] for i in optimized if i['op'] == 'DELIVERY'], ['run', 'wicket', 'run', 'run', 'run', 'run'])

    def test_unresolved_operations_keep_known_substitutions(self):
        ir = [{'op': 'ADD', 'target': 't1', 'left': 1, 'right': 2},
              {'op': 'MUL', 'target': 't2', 'left': 't1', 'right': 'external'}]
        result, _ = optimize(ir)
        self.assertEqual(result, [{'op': 'MUL', 'target': 't2', 'left': 3, 'right': 'external'}])

    def test_reassigned_unresolved_temporary_invalidates_old_constant(self):
        ir = [{'op': 'ADD', 'target': 't1', 'left': 1, 'right': 2},
              {'op': 'MUL', 'target': 't1', 'left': 'external', 'right': 2},
              {'op': 'DELIVERY', 'kind': 'run', 'value': 't1'}]
        result, _ = optimize(ir)
        self.assertEqual(result[-1]['value'], 't1')

    def test_optimization_is_idempotent(self):
        _, ir = translated('run((1+1)*2), 0, 1, wicket, 2, 6')
        once, _ = optimize(ir)
        twice, changes = optimize(once)
        self.assertEqual(once, twice)
        self.assertEqual(changes, [])

    def test_original_and_optimized_complete_scoring_outputs_match(self):
        for deliveries in ['run(2+2*2), 0, 1, wicket, 2, 4',
                           'wide, noball, bye(1+1), legbye(1), wicket, 0, 1, run(2*2)',
                           'run(0*6), 0, 0, 0, 0, 0']:
            with self.subTest(deliveries=deliveries):
                ast, ir = translated(deliveries)
                optimized, _ = optimize(ir)
                self.assertEqual(execute_target(generate_target(ir, ast)), execute_target(generate_target(optimized, ast)))

    def test_real_pipeline_runs_all_six_phases(self):
        source = TEAMS + 'innings IND { over 1 { run(2+2), 0, 1, wicket, 2, 6 } }'
        events = list(compile_events(source))
        self.assertEqual([e['phase'] for e in events if e['status'] == 'completed'], list(range(6)))
        optimization = next(e['output'] for e in events if e['phase'] == 4 and e['status'] == 'completed')
        self.assertEqual((optimization['before_count'], optimization['after_count']), (10, 9))
        self.assertEqual(events[-1]['output']['scorecard']['innings'][0]['runs'], 13)

    def test_api_returns_optimized_instructions_and_scorecard(self):
        with TestClient(app) as client:
            self.assertTrue(all(p['available'] for p in client.get('/api/health').json()['phases']))
            response = client.post('/api/compile', json={'source': TEAMS + 'innings IND { over 1 { run(2+2), 0, 1, wicket, 2, 6 } }'})
            events = [json.loads(line) for line in response.text.splitlines()]
            optimization = next(e['output'] for e in events if e['phase'] == 4 and e['status'] == 'completed')
            self.assertIn('EMIT_DELIVERY run, 4', optimization['after'])
            self.assertNotIn('t1 =', optimization['after'])
            self.assertEqual(events[-1]['output']['scorecard']['innings'][0]['wickets'], 1)

if __name__ == '__main__':
    unittest.main()
