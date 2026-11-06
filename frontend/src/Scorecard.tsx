import type { ScoreData } from './types';
import { MatchResult } from './MatchResult';
export function Scorecard({ data }: { data: ScoreData | null }) {
  return <section className="scorecard" aria-label="Scorecard"><h2>Scorecard</h2>{!data ? <p>Complete compilation to see the score.</p> : <>
    <MatchResult result={data.result}/>{data.innings.map(card => <article key={card.team}>
      <div className="score-row"><strong>{card.name}</strong><strong>{card.runs}/{card.wickets}</strong></div>
      <p>{card.overs_display} overs · {card.total_extras ?? 0} extras · {card.complete ? 'Finished' : 'In progress'}</p>
    </article>)}
  </>}</section>;
}
