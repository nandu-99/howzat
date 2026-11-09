const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/ErrorDetails.tsx'),'utf8'), {
  compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
}).outputText, {exports:exportsObject, require:name=>name.endsWith('.css') ? {} : require(name)});
const {ErrorDetails} = exportsObject;
const error = {message:'Unexpected <script> token',line:6,column:13};
test('diagnostics escape messages and fixes while keeping source recovery actions',()=>{
  const markup=renderToStaticMarkup(React.createElement(ErrorDetails, {error,phaseName:'Syntax analysis',fix:'Replace <script> with a comma.',onLocate(){},onCorrect(){}}));
  assert.match(markup,/role="alert"/);
  assert.match(markup,/Syntax analysis failed/);
  assert.match(markup,/Line 6:13/);
  assert.match(markup,/Try this:/);
  assert.match(markup,/Show in editor/);
  assert.match(markup,/Load corrected code/);
  assert.doesNotMatch(markup,/<script>/);
  assert.match(markup,/&lt;script&gt;/);
});
test('runtime diagnostics do not show a misleading original source location',()=>{
  const markup=renderToStaticMarkup(React.createElement(ErrorDetails,{error,phaseName:'Target code generation'}));
  assert.match(markup,/Target code generation failed/);
  assert.doesNotMatch(markup,/Line 6:13|Show in editor|Load corrected code|diagnostic-actions|Try this:/);
});
test('diagnostic buttons call their respective recovery handlers',()=>{
  const actions=[];
  const tree=ErrorDetails({error,onLocate:()=>actions.push('locate'),onCorrect:()=>actions.push('correct')});
  function visit(node) {
    if (!node || typeof node!=='object') return;
    if(node.type==='button') node.props.onClick();
    React.Children.toArray(node.props?.children).forEach(visit);
  }
  visit(tree);
  assert.deepEqual(actions,['locate','correct']);
});
