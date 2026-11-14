import type {ModerationCase} from '@/lib/admin-backend.server';
import styles from './ModerationQueue.module.css';

const labels={
  professional:'Маман',organization:'Компания',review:'Пікір',affiliation:'Байланыс',
} as const;
const states={
  triage:'Алғашқы тексеру',in_review:'Қаралуда',decision:'Шешім',
  appeal:'Шағым',closed:'Жабылды',
} as const;

/**
 * Server-renderable, read-only view. Data must be obtained by an authenticated
 * server BFF after session/MFA/scope verification; never pass bearer to props.
 * This component deliberately performs no fetch and grants no permissions.
 */
export function ModerationQueue({items}:{items:readonly ModerationCase[]}){
  return <section className={styles.queue} aria-labelledby="moderation-heading">
    <div className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>Services Admin</p>
        <h2 id="moderation-heading">Модерация кезегі</h2>
      </div>
      <span className={styles.count} aria-label={`Осы беттегі жазба саны: ${items.length}`}>
        {items.length} жазба (осы бет)
      </span>
    </div>
    {items.length===0?
      <p className={styles.empty} role="status">Бұл бетте көрсетілетін жазба жоқ. Басқа рұқсат етілген жазбалар болуы мүмкін.</p>:
      <div className={styles.scroll}>
        <table className={styles.table}>
          <caption className={styles.caption}>Осы беттегі рұқсат етілген модерация жазбалары</caption>
          <thead><tr><th scope="col">Түрі</th><th scope="col">Күйі</th>
            <th scope="col">Тіркелген уақыты</th><th scope="col">ID</th></tr></thead>
          <tbody>{items.map(item=><tr key={item.id}>
            <td>{labels[item.subjectKind]}</td>
            <td><span className={styles.state}>{states[item.state]}</span></td>
            <td><time dateTime={item.createdAt}>
              {new Date(item.createdAt).toLocaleString('kk-KZ',{timeZone:'UTC'})} UTC
            </time></td>
            <td><code aria-label={`Жазба идентификаторы: ${item.id}`}>{item.id.slice(0,8)}…</code></td>
          </tr>)}</tbody>
        </table>
      </div>}
  </section>;
}
