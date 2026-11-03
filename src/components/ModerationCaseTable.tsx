import type {PlatformAction,PlatformRole} from '../lib/platform-permissions';
import {canDisplayPlatformAction} from '../lib/platform-permissions';

export type PublicModerationCaseSummary={
  id:string;
  subjectKind:'professional'|'organization'|'review'|'affiliation';
  state:'triage'|'in_review'|'decision'|'appeal'|'closed';
  createdAt:string;
};

const labels={
  kk:{caseId:'Іс нөмірі',type:'Нысан',state:'Күйі',created:'Құрылған',empty:'Көрсетілетін іс жоқ'},
  ru:{caseId:'Номер дела',type:'Объект',state:'Статус',created:'Создано',empty:'Нет доступных дел'},
};

/**
 * Reusable presentational component. Do not mount until a backend-verified
 * admin session and server-filtered case list exist. Client-side policy merely
 * controls which hints are displayed; backend enforces all resource ACL.
 */
export function ModerationCaseTable({
  locale,cases,verifiedClaims,now,
}:{
  locale:'kk'|'ru';
  cases:readonly PublicModerationCaseSummary[];
  verifiedClaims:{role:PlatformRole;sessionExpiresAt:number;mfaVerifiedAt:number|null}|null;
  now:number;
}) {
  const t=labels[locale];
  if(!canDisplayPlatformAction(verifiedClaims,'moderation.read',now))return null;
  return <section aria-label={locale==='kk'?'Модерация':'Модерация'}>
    <h2>{locale==='kk'?'Модерация істері':'Дела модерации'}</h2>
    {cases.length===0?<p>{t.empty}</p>:
      <table>
        <thead><tr><th scope="col">{t.caseId}</th><th scope="col">{t.type}</th>
          <th scope="col">{t.state}</th><th scope="col">{t.created}</th></tr></thead>
        <tbody>{cases.map(c=><tr key={c.id}>
          <td>{c.id}</td><td>{c.subjectKind}</td><td>{c.state}</td>
          <td><time dateTime={c.createdAt}>{c.createdAt.slice(0,10)}</time></td>
        </tr>)}</tbody>
      </table>}
  </section>;
}
