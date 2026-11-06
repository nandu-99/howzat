import { useEffect, useMemo, useState } from 'react';
import { ParseTree } from './ParseTree';
import { astToTree, cfgExampleFromTree, collectDeliveries } from './syntaxTrees';
import type { SyntaxOutput as SyntaxData } from './types';
import './SyntaxOutput.css';
import { TokenPathDiagram } from './TokenPathDiagram';

export function SyntaxOutput({ output }: { output: SyntaxData }) {
  const { ast, parse_tree: parseTree } = output;
  const [tab, setTab] = useState('ast');
  const [selected, setSelected] = useState(0);
  const astTree = useMemo(() => astToTree(ast), [ast]);
  const deliveries = useMemo(() => collectDeliveries(parseTree), [parseTree]);
  const index = Math.min(selected, Math.max(0, deliveries.length - 1));
  const example = useMemo(() => deliveries[index] ? cfgExampleFromTree(deliveries[index].tree) : null, [deliveries, index]);
  useEffect(() => setSelected(0), [parseTree]);

  return <div className="syntax-output">
    <div className="tree-tabs" role="tablist" aria-label="Syntax analysis results">
      {[['ast', 'AST'], ['parse', 'Parse tree'], ['cfg', 'CFG rules'], ['tokens', 'Token transitions']].map(([id, title]) =>
        <button key={id} id={`syntax-tab-${id}`} type="button" role="tab" aria-selected={tab === id}
          aria-controls={`syntax-panel-${id}`} onKeyDown={event => {
            const ids = ['ast', 'parse', 'cfg', 'tokens'];
            const index = ids.indexOf(id);
            const next = event.key === 'ArrowRight' ? ids[(index + 1) % 4] : event.key === 'ArrowLeft' ? ids[(index + 3) % 4] : event.key === 'Home' ? ids[0] : event.key === 'End' ? ids[3] : null;
            if (next) { event.preventDefault(); setTab(next); document.getElementById(`syntax-tab-${next}`)?.focus(); }
          }} tabIndex={tab === id ? 0 : -1} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{title}</button>)}
    </div>
    <div role="tabpanel" id={`syntax-panel-${tab}`} aria-labelledby={`syntax-tab-${tab}`}>
      {tab === 'ast' ? <>
        <p className="tree-explanation">The AST shows the meaning of your code: teams, innings, overs, deliveries, and calculations.</p>
        <ParseTree tree={astTree} kind="ast" label="Abstract syntax tree (AST)"/>
      </> : tab === 'parse' ? <>
        <p className="tree-explanation">The parse tree also keeps grammar rules, punctuation, and empty productions.</p>
        <ParseTree tree={parseTree} label="Concrete parse tree · Full program"/>
      </> : example ? <div className="cfg-example">
        <div className="delivery-picker"><label htmlFor="syntax-delivery">Choose a delivery</label>
          <select id="syntax-delivery" value={index} onChange={event => setSelected(Number(event.target.value))}>
            {deliveries.map((delivery, i) => <option key={i} value={i}>{i + 1}. {delivery.source}</option>)}
          </select>
        </div>
        <div className="cfg-selected"><span>Selected delivery</span><code>{example.source}</code></div>
        {tab === 'tokens' ? <>
          <p className="tree-explanation">A token path for this one delivery: start at q0 and read each arrow label to reach the final state.</p>
          <TokenPathDiagram tokens={example.tokens}/>
        </> : <>
          <p className="tree-explanation">Context-free grammar (CFG) productions used to parse this delivery.</p>
          <div className="code-block"><div className="code-label">CFG rules</div><pre>{example.rules.join('\n')}</pre></div>
          <div className="code-block"><div className="code-label">Leftmost derivation</div><pre>{example.derivation.join('\n⇒ ')}{example.truncated ? '\n… more steps omitted' : ''}</pre></div>
          <p className="tree-explanation"><code>ε</code> means empty. <code>NUMBER</code> is a number token; its value comes from the selected delivery above.</p>
        </>}
      </div> : <p className="tree-explanation">No delivery is available for this example.</p>}
    </div>
  </div>;
}
