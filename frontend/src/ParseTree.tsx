import { useEffect, useMemo, useRef, useState } from 'react';
import Tree, { type RawNodeDatum } from 'react-d3-tree';
import type { ParseTreeNode } from './types';

function toTreeData(node: ParseTreeNode): RawNodeDatum {
  return {
    name: node.symbol,
    ...(node.children.length ? { children: node.children.map(toTreeData) } : {}),
  };
}

export function ParseTree({ tree, label = 'Concrete parse tree', kind = 'parse' }: { tree: ParseTreeNode; label?: string; kind?: 'parse' | 'ast' }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState({ zoom: 0.75, translate: { x: 300, y: 48 } });
  const latestView = useRef(view);
  const data = useMemo(() => toTreeData(tree), [tree]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = entry.contentRect.width;
      if (nextWidth > 0) setWidth(nextWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const next = { zoom: 0.75, translate: { x: width / 2, y: 48 } };
    setView(next);
    latestView.current = next;
    setExpanded(false);
    setRevision(value => value + 1);
  }, [tree, width]);

  const reset = (expandAll = false) => {
    const next = { zoom: expandAll ? 0.5 : 0.75, translate: { x: width / 2, y: 48 } };
    latestView.current = next;
    setView(next);
    setExpanded(expandAll);
    setRevision(value => value + 1);
  };
  const zoom = (factor: number) => {
    const previous = latestView.current;
    const nextZoom = Math.max(0.15, Math.min(2, previous.zoom * factor));
    // Keep the canvas center stationary while the toolbar changes scale.
    const ratio = nextZoom / previous.zoom;
    const center = { x: width / 2, y: (container.current?.clientHeight ?? 460) / 2 };
    const next = { zoom: nextZoom, translate: {
      x: center.x - (center.x - previous.translate.x) * ratio,
      y: center.y - (center.y - previous.translate.y) * ratio,
    } };
    latestView.current = next;
    setView(next);
  };

  return <section className="parse-tree" aria-label={label}>
    <div className="parse-tree-toolbar"><span>{label}</span><div>
      <button type="button" onClick={() => zoom(1 / 1.25)} aria-label="Zoom out" title="Zoom out">−</button>
      <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in" title="Zoom in">+</button>
      <button type="button" onClick={() => reset()} aria-label="Reset tree view" title="Reset view">Reset</button>
      <button type="button" onClick={() => reset(!expanded)} className="tree-expand-button"><span>{expanded ? 'Collapse' : 'Expand all'}</span></button>
    </div></div>
    <div ref={container} className="parse-tree-canvas">
      <Tree key={revision} data={data} orientation="vertical" pathFunc="step"
        translate={view.translate} zoom={view.zoom} scaleExtent={{ min: 0.15, max: 2 }}
        nodeSize={{ x: 210, y: 105 }} separation={{ siblings: 1, nonSiblings: 1.1 }}
        initialDepth={expanded ? undefined : 3} transitionDuration={0}
        zoomable draggable collapsible hasInteractiveNodes
        onUpdate={({ translate, zoom: currentZoom }) => { latestView.current = { translate, zoom: currentZoom }; }}
        renderCustomNodeElement={({ nodeDatum, toggleNode }) => {
          const branch = Boolean(nodeDatum.children?.length);
          const collapsed = nodeDatum.__rd3t.collapsed;
          const empty = nodeDatum.name === 'ε';
          const nodeWidth = Math.max(70, Math.min(190, nodeDatum.name.length * 8 + 38));
          return <g className={`parse-tree-node ${branch ? 'nonterminal' : empty ? 'epsilon' : 'terminal'}`}
            role={branch ? 'button' : undefined} tabIndex={branch ? 0 : undefined}
            aria-label={branch ? `${nodeDatum.name}, ${collapsed ? 'expand' : 'collapse'} branch` : nodeDatum.name}
            aria-expanded={branch ? !collapsed : undefined}
            onClick={branch ? toggleNode : undefined}
            onKeyDown={branch ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); toggleNode(); } } : undefined}>
            <title>{`${nodeDatum.name}${branch ? ` (${nodeDatum.children!.length} children)` : ''}`}</title>
            <rect x={-nodeWidth / 2} y={-17} width={nodeWidth} height={34} rx={5}/>
            <text textAnchor="middle" dominantBaseline="central">{nodeDatum.name.length > 22 ? nodeDatum.name.slice(0, 21) + '…' : nodeDatum.name}</text>
            {branch && <><circle className="tree-toggle" cy={23} r={8}/><text className="tree-toggle-label" textAnchor="middle" y={23} dominantBaseline="central">{collapsed ? '+' : '−'}</text></>}
          </g>;
        }}/>
    </div>
    <div className="parse-tree-footer"><span className="tree-legend"><i className="nonterminal"/>{kind === 'ast' ? 'Structure' : 'Nonterminal'} <i className="terminal"/>{kind === 'ast' ? 'Value' : 'Terminal'}{kind === 'parse' && <><i className="epsilon"/>Empty (ε)</>}</span><span>Drag to pan · Scroll to zoom · Click a branch to toggle</span></div>
  </section>;
}
