const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/api.ts'), 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { exports: exportsObject, TextDecoder, JSON, Error, Number });
const { readEvents, sourceRange } = exportsObject;
function response(chunks) {
  return new Response(new ReadableStream({ start(controller) {
    for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
    controller.close();
  } }));
}
test('reads split JSON events including an unterminated final line', async () => {
  const events = [];
  await readEvents(response(['{"phase":0,"status":"run', 'ning"}\n{"phase":0,"status":"unavailable"}']), event => events.push(event));
  assert.equal(events.length, 2);
  assert.equal(events[1].status, 'unavailable');
});
test('rejects an interrupted compile stream', async () => {
  await assert.rejects(readEvents(response(['{"phase":0,"status":"running"}\n']), () => {}), /before a final result/);
});
test('rejects an HTTP error', async () => {
  await assert.rejects(readEvents(new Response('', {status: 500}), () => {}), /500/);
});
test('rejects invalid event phase and status', async () => {
  for (const value of [{phase: 9, status: 'completed'}, {phase: 0, status: 'success'}]) {
    await assert.rejects(readEvents(response([JSON.stringify(value)]), () => {}), /invalid phase/);
  }
});
test('locates exact error span in multiline source', () => {
  const text = 'team IND\n  run(99)';
  const [start, end] = sourceRange(text, 2, 7, 9);
  assert.equal(text.slice(start, end), '99');
});
test('clamps out-of-range source positions', () => {
  const [start, end] = sourceRange('abc', 99, 99);
  assert.equal(start, 3); assert.equal(end, 3);
});
