import { CheckIcon, Cross2Icon, CircleIcon, MinusIcon, ReloadIcon } from '@radix-ui/react-icons';
import { PHASE_NAMES, type PhaseEvent } from './types';
const names = ['Lexer', 'Parser', 'Rules', 'IR', 'Optimize', 'Python'];
const icons = {pending: CircleIcon, running: ReloadIcon, completed: CheckIcon, failed: Cross2Icon, skipped: MinusIcon, unavailable: MinusIcon};
export function PhaseOverview({ phases, selected, onSelect }: { phases: PhaseEvent[]; selected: number; onSelect: (index: number) => void }) {
  return <nav className="phase-strip" aria-label="Compiler phases">{PHASE_NAMES.map((name, index) => {
    const phase = phases[index]; const Icon = icons[phase.status];
    return <button key={name} className={selected === index ? 'selected' : ''} data-status={phase.status} onClick={() => onSelect(index)} aria-current={selected === index ? 'step' : undefined} aria-label={`${index+1}. ${name}: ${phase.status}`} title={`${name}: ${phase.status}`}>
      <span className="phase-number" aria-hidden="true">{index+1}</span>{names[index]}<span className={phase.status}><Icon width={15} height={15} className={phase.status === 'running' ? 'spin' : undefined} aria-hidden="true"/></span>
    </button>;
  })}</nav>;
}
