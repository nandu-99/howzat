import { useMemo } from 'react';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Node, type NodeProps, type Edge } from '@xyflow/react';
import { buildTokenPath } from './syntaxTrees';
import '@xyflow/react/dist/style.css';

type StateData = { label: string; initial: boolean; accepting: boolean };
type StateNode = Node<StateData, 'state'>;
const positions = { left: Position.Left, right: Position.Right, top: Position.Top, bottom: Position.Bottom };

function StateCircle({ data }: NodeProps<StateNode>) {
  return <div className={`cfg-state ${data.initial ? 'initial' : ''} ${data.accepting ? 'accepting' : ''}`}>
    {Object.entries(positions).flatMap(([side, position]) => [
      <Handle key={`target-${side}`} type="target" position={position} id={`target-${side}`} isConnectable={false}/>,
      <Handle key={`source-${side}`} type="source" position={position} id={`source-${side}`} isConnectable={false}/>,
    ])}
    <span className="cfg-state-name">{data.label}</span>
    {(data.initial || data.accepting) && <span className="cfg-state-kind">{data.initial && data.accepting ? 'Initial / Final' : data.initial ? 'Initial' : 'Final'}</span>}
  </div>;
}

function EntryArrow() {
  return <div className="cfg-entry">Start<Handle type="source" position={Position.Right} isConnectable={false}/></div>;
}
const nodeTypes = { state: StateCircle, entry: EntryArrow };

export function TokenPathDiagram({ tokens }: { tokens: string[] }) {
  const path = useMemo(() => buildTokenPath(tokens), [tokens]);
  const nodes = useMemo<Node[]>(() => [
    { id: 'entry', type: 'entry', position: { x: -40, y: 76 }, data: {} },
    ...path.states.map(state => ({ id: state.id, type: 'state', position: state.position,
      data: { label: state.id, initial: state.initial, accepting: state.accepting },
      ariaLabel: `${state.id}${state.initial ? ', initial state' : ''}${state.accepting ? ', final accepting state' : ''}`,
    })),
  ], [path]);
  const edges = useMemo<Edge[]>(() => [
    { id: 'start', source: 'entry', target: 'q0', targetHandle: 'target-left' },
    ...path.transitions,
  ].map(edge => ({ ...edge, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#b3e987', width: 18, height: 18 },
    style: { stroke: '#91b879', strokeWidth: 1.8 }, labelStyle: { fill: '#d8eacb', fontSize: 13, fontWeight: 500 },
    labelBgStyle: { fill: '#1c291c', fillOpacity: 1 }, labelBgPadding: [7, 4], labelBgBorderRadius: 4,
  })), [path]);

  return <section className="cfg-diagram" aria-label="Selected delivery state transition diagram">
    <div className="code-label">Token transitions for this delivery</div>
    <div className="cfg-diagram-canvas" style={{ height: Math.min(500, Math.max(250, path.rows * 150 + 100)) }}>
      <ReactFlow key={tokens.join('\u0000')} nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        colorMode="dark" fitView fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }} minZoom={0.2} maxZoom={2}
        nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false}
        aria-label="Initial state, token transitions, and final accepting state">
        <Background color="#324235" gap={20}/>
        <Controls showInteractive={false}/>
      </ReactFlow>
    </div>
    <p className="cfg-diagram-note">Start at q0. Follow each labeled arrow in order. The double circle marks the final state after every token is read.</p>
    <details className="cfg-transition-list"><summary>Read transitions as text</summary><ol>{path.transitions.map(edge => <li key={edge.id}><code>{edge.source} → {edge.target}</code> on <code>{edge.label}</code></li>)}</ol></details>
  </section>;
}
