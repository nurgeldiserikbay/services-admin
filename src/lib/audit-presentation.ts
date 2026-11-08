/**
 * Audit view is read-only. All rows MUST be server-filtered by dedicated
 * administrator identity, scope, and resource permission, then redacted.
 * This client-side check is defense in depth, never an authorization boundary.
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

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTION=/^[a-z][a-z0-9_.-]{1,95}$/;
const REASON=/^[A-Z0-9_]{2,64}$/;
const SUBJECT_KINDS=new Set(['professional','organization','review','affiliation','moderation_case']);
const AUDIT_KEYS=['id','action','subjectKind','subjectId','actorId','occurredAt','reasonCode'] as const;

function isValidUtcCalendarTime(value:string):boolean{
  const year=Number(value.slice(0,4));
  const month=Number(value.slice(5,7));
  const day=Number(value.slice(8,10));
  const hour=Number(value.slice(11,13));
  const minute=Number(value.slice(14,16));
  const second=Number(value.slice(17,19));
  const date=new Date(value);
  return date.getUTCFullYear()===year&&date.getUTCMonth()+1===month&&
    date.getUTCDate()===day&&date.getUTCHours()===hour&&
    date.getUTCMinutes()===minute&&date.getUTCSeconds()===second;
}

/**
 * Reject unexpected fields rather than accidentally spreading private API
 * fields into presentation models. Server-side redaction remains mandatory.
 */
export function isSafeAuditPage(
  entries:readonly SafeAuditEntry[],
  maxPageSize=50,
):boolean{
  if(!Array.isArray(entries)||!Number.isInteger(maxPageSize)||
    maxPageSize<1||maxPageSize>50||entries.length>maxPageSize)return false;
  const seenIds=new Set<string>();
  return entries.every(value=>{
    if(value===null||typeof value!=='object'||Array.isArray(value))return false;
    const e=value as Record<string,unknown>;
    if(Object.keys(e).length!==AUDIT_KEYS.length||
      !AUDIT_KEYS.every(key=>Object.hasOwn(e,key)))return false;
    if(typeof e.id!=='string'||typeof e.subjectId!=='string'||
      typeof e.actorId!=='string'||typeof e.action!=='string'||
      typeof e.subjectKind!=='string'||typeof e.occurredAt!=='string')return false;
    if(!UUID.test(e.id)||!UUID.test(e.subjectId)||!UUID.test(e.actorId)||
      !ACTION.test(e.action)||!SUBJECT_KINDS.has(e.subjectKind))return false;
    // UTC timestamps only; reject permissively parsed dates and invalid days.
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(e.occurredAt)||
      !Number.isFinite(Date.parse(e.occurredAt))||
      !isValidUtcCalendarTime(e.occurredAt))return false;
    if(!(e.reasonCode===null||
      (typeof e.reasonCode==='string'&&REASON.test(e.reasonCode))))return false;
    const id=e.id.toLowerCase();
    if(seenIds.has(id))return false;
    seenIds.add(id);
    return true;
  });
}
