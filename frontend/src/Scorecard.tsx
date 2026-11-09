import type { ScoreData } from './types';
import { ClipboardIcon } from '@radix-ui/react-icons';
import { MatchResult } from './MatchResult';
export function Scorecard({ data }: { data: ScoreData | null }) {
  return <section id="scorecard" tabIndex={-1} className="scorecard" aria-label="Scorecard"><div className="scorecard-heading"><h2>Scorecard</h2><span>Match result</span></div>{!data ? <div className="score-empty"><ClipboardIcon aria-hidden="true"/><p>Compile your code to see the score.</p></div> : <>
    <MatchResult result={data.result}/>{data.innings.map(card => <article key={card.team}>
      <div className="score-row"><strong>{card.name}</strong><strong>{card.runs}/{card.wickets}</strong></div>
      <p>{card.overs_display} overs · {card.total_extras ?? 0} extras · {card.complete ? 'Finished' : 'In progress'}{card.run_rate !== undefined ? ` · Run rate ${card.run_rate}` : ''}</p>
      {card.extras && <p className="extras-detail">Wides {card.extras.wide} · No-balls {card.extras.noball} · Byes {card.extras.bye} · Leg-byes {card.extras.legbye}</p>}
      {card.history && <details className="delivery-history"><summary>Delivery history ({card.history.length})</summary><div className="history-scroll"><table>
        <caption className="sr-only">Delivery history for {card.name}</caption>
        <thead><tr><th scope="col">Over</th><th scope="col">Kind</th><th scope="col">Runs</th><th scope="col">Legal</th><th scope="col">Score</th></tr></thead>
        <tbody>{card.history.map((ball, index) => <tr key={index}><td>{ball.over}</td><td>{ball.kind}</td><td>{ball.runs}</td><td>{ball.legal ? 'Yes' : 'No'}</td><td>{ball.score}</td></tr>)}</tbody>
      </table></div></details>}
    </article>)}
  </>}</section>;
}
