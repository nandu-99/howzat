const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const {execFileSync} = require('node:child_process');
const {JSDOM} = require('jsdom');
const ts = require('typescript');
const repo = path.resolve(__dirname, '../..');
const python = [path.join(repo,'.venv/bin/python'),path.join(repo,'../.venv/bin/python')].find(fs.existsSync);
const fixture = JSON.parse(execFileSync(python, ['-c', `
import json
from backend.main import health
from backend.language import EXAMPLES, language_reference
from backend.compiler.pipeline import compile_events
sources = [e['source'] for e in EXAMPLES] + [e['fixed_source'] for e in EXAMPLES if 'fixed_source' in e]
print(json.dumps({'health':health(), 'examples':EXAMPLES, 'reference':language_reference(), 'events':{s:list(compile_events(s)) for s in sources}}))
`], {cwd:repo,encoding:'utf8',maxBuffer:20*1024*1024}));
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'http://localhost:5173/'});
for (const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,sessionStorage:dom.window.sessionStorage,getComputedStyle:dom.window.getComputedStyle,IS_REACT_ACT_ENVIRONMENT:true})) Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
dom.window.HTMLElement.prototype.scrollIntoView = function() {};
const React = require('react');
const {act} = React;
const {createRoot} = require('react-dom/client');
const {BrowserRouter} = require('react-router-dom');
for (const extension of ['.ts','.tsx']) Module._extensions[extension] = (module,filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
};
Module._extensions['.css'] = () => {};
const originalLoad = Module._load;
Module._load = function(name,...args) {
  if (name === './ParseTree') return {ParseTree:({label})=>React.createElement('div',null,label)};
  if (name === './TokenPathDiagram') return {TokenPathDiagram:()=>React.createElement('div',null,'Token path')};
  return originalLoad.call(this,name,...args);
};
const {App} = require('../src/main.tsx');
Module._load = originalLoad;
let offline = false, hold = false, release;
function streamEvents(events) {
  const text = events.map(event=>JSON.stringify(event)).join('\n')+'\n';
  const cut = Math.floor(text.length/2);
  return new Response(new ReadableStream({start(controller){
    controller.enqueue(new TextEncoder().encode(text.slice(0,cut)));
    controller.enqueue(new TextEncoder().encode(text.slice(cut)));controller.close();
  }}));
}
globalThis.fetch = async (url,options={}) => {
  if (String(url) === '/api/health') {
    if (offline) throw new Error('offline');
    return Response.json(fixture.health);
  }
  if (String(url) === '/api/examples') return Response.json(fixture.examples);
  if (String(url) === '/api/language') return Response.json(fixture.reference);
  if (String(url) === '/api/compile') {
    const source = JSON.parse(options.body).source;
    assert.ok(fixture.events[source], 'compiler fixture for selected source');
    if (hold) return new Promise(resolve=>{release=()=>resolve(streamEvents(fixture.events[source]));});
    return streamEvents(fixture.events[source]);
  }
  throw new Error('Unexpected URL '+url);
};
async function mount() {
  sessionStorage.clear();window.history.replaceState({},'','/');
  const host=document.createElement('div');document.body.append(host);
  const root=createRoot(host);
  await act(async()=>{root.render(React.createElement(BrowserRouter,null,React.createElement(App)));});
  return {host,async close(){await act(async()=>root.unmount());host.remove();}};
}
async function click(element) { assert.ok(element);await act(async()=>element.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}))); }
async function select(host,id) { await act(async()=>{const picker=host.querySelector('#example');picker.value=id;picker.dispatchEvent(new window.Event('change',{bubbles:true}));}); }
const button = (host,label)=>[...host.querySelectorAll('button')].find(button=>button.textContent===label);

test('all eight examples, error selection, corrections, match results, and navigation work together', async()=>{
  offline=false;hold=false;const app=await mount();
  try {
    assert.equal(app.host.querySelectorAll('#example optgroup option').length,8);
    assert.equal(app.host.querySelector('#example').tagName,'SELECT');
    assert.equal(app.host.querySelector('.brand-mark').getAttribute('src'),'/assets/howzat-mark-128.png');
    assert.equal(app.host.querySelectorAll('.workflow li').length,3);
    assert.ok(app.host.querySelector('#source').classList.contains('source-textarea'));
    for (const example of fixture.examples) {
      await select(app.host,example.id);
      await click(app.host.querySelector('.primary'));
      if (example.failure_phase !== undefined) {
        const diagnostic=app.host.querySelector('.error');assert.ok(diagnostic);
        assert.ok(diagnostic.textContent.includes(example.fix));
        await click(button(app.host,'Show in editor'));
        const editor=app.host.querySelector('#source');
        const error=fixture.events[example.source].find(event=>event.status==='failed').error;
        const offset=example.source.split('\n').slice(0,error.line-1).reduce((sum,line)=>sum+line.length+1,0)+error.column-1;
        assert.equal(editor.selectionStart,offset);
        assert.equal(app.host.querySelectorAll('.score-row').length,0);
        await click(button(app.host,'Load corrected code'));
        assert.equal(editor.value,example.fixed_source);
        await click(app.host.querySelector('.primary'));
        assert.ok(app.host.querySelector('.score-row'));
      } else {
        assert.equal(app.host.querySelectorAll('.phase-strip .completed').length,6);
        assert.equal(app.host.querySelector('.phase-total').textContent,'6/6');
        assert.ok(app.host.querySelector('.score-row'));
      }
    }
    await select(app.host,'multiple');await click(app.host.querySelector('.primary'));
    assert.ok(app.host.querySelector('.match-result').textContent.includes('India won by 3 runs'));
    assert.equal(app.host.querySelectorAll('.delivery-history tbody tr').length,24);
    const source=app.host.querySelector('#source').value;
    await click(app.host.querySelector('a[href="/language"]'));
    assert.equal(window.location.pathname,'/language');
    assert.ok(app.host.querySelector('#tokens'));
    await click(app.host.querySelector('.app-navigation a[href="/"]'));
    assert.equal(app.host.querySelector('#source').value,source);
    assert.ok(app.host.querySelector('.match-result').textContent.includes('India won by 3 runs'));
    await act(async()=>window.dispatchEvent(new window.Event('focus')));
    assert.equal(app.host.querySelector('#source').value,source);
  } finally {await app.close();}
});
test('offline backend disables compilation and retry restores it',async()=>{
  offline=true;const app=await mount();
  try {
    assert.equal(app.host.querySelector('.primary').disabled,true);
    offline=false;await click(app.host.querySelector('.connection'));
    assert.equal(app.host.querySelector('.primary').disabled,false);
  } finally {offline=false;await app.close();}
});
test('cancelled requests cannot restore stale scorecards',async()=>{
  offline=false;hold=true;const app=await mount();
  try {
    await click(app.host.querySelector('.primary'));
    await click(button(app.host,'Cancel'));
    assert.ok(app.host.textContent.includes('Compilation cancelled.'));
    hold=false;await select(app.host,'extras');
    await act(async()=>release());
    assert.equal(app.host.querySelector('#source').value,fixture.examples.find(e=>e.id==='extras').source);
    assert.equal(app.host.querySelectorAll('.score-row').length,0);
    await click(app.host.querySelector('.primary'));
    assert.ok(app.host.querySelector('.score-row').textContent.includes('16/0'));
  } finally {hold=false;await app.close();}
});
