import { PHASE_NAMES, type PhaseEvent } from './types';
const icons = { pending: '○', running: '◌', completed: '✓', failed: '✕', skipped: '—', unavailable: '—' };
export function PhaseOverview({ phases, selected, onSelect }: { phases: PhaseEvent[]; selected: number; onSelect: (index: number) => void }) {
  return <nav className="phase-strip" aria-label="Compiler phases">{PHASE_NAMES.map((name, index) => {
    const phase = phases[index];
    return <button key={name} className={selected === index ? 'selected' : ''} onClick={() => onSelect(index)} aria-current={selected === index ? 'step' : undefined} title={`${name}: ${phase.status}`}>
      <span className={phase.status}>{icons[phase.status]}</span> {index + 1}. {name}
    </button>;
  })}</nav>;
}
