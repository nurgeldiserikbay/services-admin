/**
 * Audit view is read-only. All rows MUST be server-filtered by dedicated
 * administrator identity, scope, and resource permission, then redacted.
 */
export type SafeAuditEntry=Readonly<{
  id:string;
  action:string;
  subjectKind:'professional'|'organization'|'review'|'affiliation'|'moderation_case';
  subjectId:string;
  actorId:string;
  occurredAt:string;
  reasonCode:string|null;
}>;

export function formatSafeAuditEntries(
  entries:readonly SafeAuditEntry[],
  locale:'kk'|'ru',
):readonly (SafeAuditEntry&{actionLabel:string})[]{
  const names:Record<string,{kk:string;ru:string}>={
    'moderation.case_opened':{kk:'Іс ашылды',ru:'Дело открыто'},
    'moderation.restricted':{kk:'Шектеу қолданылды',ru:'Введено ограничение'},
    'moderation.restriction_revoked':{kk:'Шектеу жойылды',ru:'Ограничение отменено'},
    'moderation.escalated':{kk:'Қайта қарауға жіберілді',ru:'Передано на пересмотр'},
  };
  return entries.map(row=>({
    ...row,
    actionLabel:names[row.action]?.[locale] ??
      (locale==='kk'?'Әрекет тіркелді':'Действие зарегистрировано'),
  }));
}

export function isSafeAuditPage(
  entries:readonly SafeAuditEntry[],
  maxPageSize=50,
):boolean{
  if(entries.length>maxPageSize)return false;
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return entries.every(e=>
    UUID.test(e.id)&&UUID.test(e.subjectId)&&UUID.test(e.actorId)&&
    /^[a-z][a-z0-9_.-]{1,95}$/.test(e.action)&&
    !Number.isNaN(Date.parse(e.occurredAt))&&
    (e.reasonCode===null||/^[A-Z0-9_]{2,64}$/.test(e.reasonCode))
  );
}
