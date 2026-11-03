'use client';

import {useRef,useState,type FormEvent} from 'react';
import type {PlatformRole} from '../lib/platform-permissions';
import {
  validateModerationReview,type CaseReview,type ModerationDecision,
} from '../lib/moderation-review';

const labels={
  kk:{
    heading:'Істі қарау',reason:'Шешім себебі',retain:'Сақтау',
    restrict:'Шектеу',escalate:'Жоғары деңгейге жіберу',
    submit:'Шешімді жіберу',working:'Тексерілуде…',
    error:'Сервер шешімді қабылдамады. Істі қайта тексеріңіз.',
    note:'Түпкілікті шешім тек сервер рұқсат, аудит және нұсқа нөмірін тексергенде қабылданады.',
  },
  ru:{
    heading:'Рассмотрение дела',reason:'Основание решения',retain:'Оставить',
    restrict:'Ограничить',escalate:'Эскалировать',
    submit:'Отправить решение',working:'Проверяем…',
    error:'Сервер не принял решение. Перепроверьте дело.',
    note:'Решение вступает в силу только после серверной проверки прав, аудита и версии.',
  },
} as const;

/**
 * Server supplies a verified privileged session and an authorized case. This
 * presentation component never replaces backend ACL or emits a public route.
 */
export function ModerationCaseReview({
  locale,caseSummary,claims,now,onDecision,
}:{
  locale:'kk'|'ru';
  caseSummary:CaseReview;
  claims:{role:PlatformRole;sessionExpiresAt:number;mfaVerifiedAt:number|null}|null;
  now:number;
  onDecision:(payload:{
    caseId:string;expectedRevision:number;decision:ModerationDecision;reason:string;
  })=>Promise<'ok'|'conflict'|'forbidden'|'error'>;
}){
  const t=labels[locale];
  const [reason,setReason]=useState('');
  const [decision,setDecision]=useState<ModerationDecision>('retain');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(false);
  const lock=useRef(false);
  const check=validateModerationReview(caseSummary,{
    decision,reason,expectedRevision:caseSummary.revision,
  },claims,now);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(lock.current||!check.valid)return;
    lock.current=true;setBusy(true);setError(false);
    try{
      const outcome=await onDecision({
        caseId:caseSummary.id,expectedRevision:caseSummary.revision,
        decision,reason:reason.trim(),
      });
      // Parent refreshes server-authoritative state after an accepted action.
      if(outcome!=='ok')setError(true);
    }catch{setError(true);}
    finally{setBusy(false);lock.current=false;}
  }
  if(!claims)return null;
  return <section aria-label={t.heading}>
    <h2>{t.heading}</h2>
    <p>{caseSummary.subjectKind} — {caseSummary.id}</p>
    <form onSubmit={submit}>
      <label htmlFor="moderation-decision">{t.heading}</label>
      <select id="moderation-decision" value={decision}
        onChange={e=>setDecision(e.target.value as ModerationDecision)}>
        <option value="retain">{t.retain}</option>
        <option value="restrict">{t.restrict}</option>
        <option value="escalate">{t.escalate}</option>
      </select>
      <label htmlFor="moderation-reason">{t.reason}</label>
      <textarea id="moderation-reason" value={reason} maxLength={2000}
        onChange={e=>setReason(e.target.value)} required rows={5}/>
      <button type="submit" disabled={busy||!check.valid}>
        {busy?t.working:t.submit}
      </button>
      {error&&<p role="alert">{t.error}</p>}
    </form>
    <p>{t.note}</p>
  </section>;
}
