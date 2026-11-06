import copy
import json
from types import SimpleNamespace
import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.compiler.lexer import tokenize
from backend.compiler.parser import parse
from backend.compiler.semantic import validate
from backend.compiler.ir import generate_ir, format_ir
from backend.compiler.pipeline import compile_events, load_phase

TEAMS = 'team IND "India"; team AUS "Australia"; '
def ast_for(deliveries='0, 1, 4, 0, 2, 6'):
    ast, _ = parse(tokenize(TEAMS + 'innings IND { over 1 { ' + deliveries + ' } }'))
    validate(ast)
    return ast

class IRTests(unittest.TestCase):
    def test_simple_delivery_order_and_boundaries(self):
        instructions = generate_ir(ast_for())
        self.assertEqual([i['op'] for i in instructions], ['INNINGS', 'OVER'] + ['DELIVERY'] * 6 + ['END_INNINGS'])
        self.assertEqual([i['value'] for i in instructions if i['op'] == 'DELIVERY'], [0, 1, 4, 0, 2, 6])
        self.assertEqual(instructions[0]['team'], 'IND')
        json.dumps(instructions)

    def test_arithmetic_is_lowered_in_dependency_order_without_folding(self):
        instructions = generate_ir(ast_for('run(2+2*2)'))
        operations = [i for i in instructions if i['op'] in {'ADD', 'MUL'}]
        self.assertEqual(operations, [
            {'op': 'MUL', 'target': 't1', 'left': 2, 'right': 2},
            {'op': 'ADD', 'target': 't2', 'left': 2, 'right': 't1'}])
        self.assertEqual(instructions[-2]['value'], 't2')

    def test_temporaries_are_unique_across_deliveries_and_innings(self):
        source = TEAMS + 'innings IND { over 1 { run(1+1), run(2*2) } } innings AUS { over 1 { run(1+2) } }'
        ast, _ = parse(tokenize(source))
        validate(ast)
        ir = generate_ir(ast)
        self.assertEqual([i['target'] for i in ir if 'target' in i], ['t1', 't2', 't3'])
        self.assertEqual([i['op'] for i in ir].count('END_INNINGS'), 2)

    def test_completion_and_partial_flags(self):
        ast, _ = parse(tokenize(TEAMS + 'innings IND complete { over 1 partial { 1 } }'))
        ir = generate_ir(ast)
        self.assertTrue(ir[0]['complete'])
        self.assertTrue(ir[1]['partial'])
        self.assertIn('COMPLETE', format_ir(ir))
        self.assertIn('PARTIAL', format_ir(ir))

    def test_metadata_is_retained_but_hidden_in_listing(self):
        ast = ast_for('run(2+2)')
        original = copy.deepcopy(ast)
        ir = generate_ir(ast)
        ball = ir[-2]
        node = ast['innings'][0]['overs'][0]['deliveries'][0]
        self.assertEqual((ball['line'], ball['column'], ball['end_column']), (node['line'], node['column'], node['end_column']))
        self.assertNotIn('; line', format_ir(ir))
        self.assertEqual(ast, original)

    def test_unknown_instruction_is_not_silently_formatted(self):
        with self.assertRaises(ValueError):
            format_ir([{'op': 'UNKNOWN'}])

    def test_api_exposes_real_ir(self):
        with TestClient(app) as client:
            self.assertTrue(client.get('/api/health').json()['phases'][3]['available'])
            response = client.post('/api/compile', json={'source': TEAMS + 'innings IND { over 1 { run(2+2), 0, 1, 0, 2, 6 } }'})
            events = [json.loads(line) for line in response.text.splitlines()]
            output = next(e['output'] for e in events if e['phase'] == 3 and e['status'] == 'completed')
            self.assertIn('t1 = 2 + 2', output['code'])
            self.assertIn('EMIT_DELIVERY run, t1', output['code'])

    def test_real_translation_pipeline_with_test_only_optimizer_adapter(self):
        # Isolate translation from optimization; this adapter exists only in tests.
        def loader(index):
            if index == 4:
                return SimpleNamespace(optimize=lambda ir: (ir, []))
            return load_phase(index)
        events = list(compile_events(TEAMS + 'innings IND { over 1 { run(2+2), 0, 1, 0, 2, 6 } }', loader))
        self.assertEqual([e['phase'] for e in events if e['status'] == 'completed'], list(range(6)))
        score = events[-1]['output']['scorecard']
        self.assertEqual(score['innings'][0]['runs'], 13)
        self.assertEqual(score['result']['status'], 'in_progress')
