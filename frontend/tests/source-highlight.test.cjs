const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/sourceHighlight.ts'),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText,{exports:exportsObject});
const {highlightSource} = exportsObject;
test('highlighting preserves every input character including blank lines and Unicode',()=>{
  for (const source of ['', 'team IND "भारत";\r\n\n// note\n', 'innings IND { over 1 { 4, @ } }', '"<script>"']) {
    assert.equal(highlightSource(source).map(part=>part.text).join(''),source);
  }
});
test('comments and strings take precedence over keyword coloring',()=>{
  const parts=highlightSource('"team // India" // innings 4\nteam IND');
  assert.equal(parts[0].kind,'string');
  assert.ok(parts.some(part=>part.text==='// innings 4' && part.kind==='comment'));
  assert.ok(parts.some(part=>part.text==='team' && part.kind==='keyword'));
});
test('keyword prefixes remain identifiers and numbers receive a distinct style',()=>{
  const parts=highlightSource('team_score run(2+2)');
  assert.equal(parts[0].kind,'plain');
  assert.equal(parts.filter(part=>part.kind==='number').length,2);
  assert.ok(parts.some(part=>part.text==='run' && part.kind==='keyword'));
});
