import type {SafeAuditEntry} from '../lib/audit-presentation';
import {formatSafeAuditEntries,isSafeAuditPage} from '../lib/audit-presentation';

const labels={
  kk:{title:'Аудит журналы',action:'Әрекет',subject:'Нысан',actor:'Орындаушы ID',date:'Уақыты',reason:'Негіз коды',empty:'Жазба жоқ'},
  ru:{title:'Журнал аудита',action:'Действие',subject:'Объект',actor:'ID исполнителя',date:'Время',reason:'Код основания',empty:'Записей нет'},
} as const;

/**
 * This is an unmounted audited-view presentation only. In particular, IDs
 * are not editable and the component does NOT implement a browser export.
 */
export function AdminAuditTable({
  locale,entries,
}:{locale:'kk'|'ru';entries:readonly SafeAuditEntry[]}){
  if(!isSafeAuditPage(entries))return null;
  const t=labels[locale];
  const rows=formatSafeAuditEntries(entries,locale);
  return <section aria-label={t.title}>
    <h2>{t.title}</h2>
    {rows.length===0?<p role="status">{t.empty}</p>:
      <div style={{overflowX:'auto'}}>
        <table>
          <thead><tr><th scope="col">{t.action}</th><th scope="col">{t.subject}</th>
            <th scope="col">{t.actor}</th><th scope="col">{t.date}</th>
            <th scope="col">{t.reason}</th></tr></thead>
          <tbody>{rows.map(row=><tr key={row.id}>
            <td>{row.actionLabel}</td>
            <td>{row.subjectKind}: {row.subjectId}</td>
            <td>{row.actorId}</td>
            <td><time dateTime={row.occurredAt}>{row.occurredAt}</time></td>
            <td>{row.reasonCode??'—'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
  </section>;
}
