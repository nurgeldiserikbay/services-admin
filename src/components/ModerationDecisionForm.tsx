'use client';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function ModerationDecisionForm({caseId,csrf}:{caseId:string;csrf:string}){
 const router=useRouter();const sending=useRef(false);
 const [profile,setProfile]=useState(''),[version,setVersion]=useState('');
 const [decision,setDecision]=useState<'APPROVE'|'REJECT'>('REJECT');
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 const [message,setMessage]=useState('');
 const v=Number(version);
 const valid=UUID.test(profile)&&/^[1-9][0-9]{0,9}$/.test(version)&&Number.isSafeInteger(v)&&v<=2147483646;
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!valid||!confirmed||sending.current||done)return;
  sending.current=true;setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/moderation/cases/'+caseId+'/decision',{
    method:'POST',headers:{'Content-Type':'application/json','x-services-admin-csrf':csrf},
    credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
    body:JSON.stringify({profile_id:profile.toLowerCase(),profile_version:v,decision}),
   });
   if(response.status===200){setDone(true);setMessage('Шешім тіркелді.');router.refresh();}
   else if(response.status===409){setDone(true);setMessage('Іс күйі немесе профиль нұсқасы өзгерген. Бетті жаңартыңыз.');}
   else setMessage('Шешім расталмады. Қайта тексеріңіз.');
  }catch{setMessage('Шешім расталмады. Қайта тексеріңіз.');}
  finally{sending.current=false;setBusy(false);}
 }
 return <form onSubmit={submit}>
  <label>Профиль UUID-і <input value={profile} maxLength={36} autoComplete="off" spellCheck={false} disabled={busy||done} onChange={e=>{setProfile(e.target.value);setConfirmed(false);}} required/></label>
  <label>Нұсқасы <input type="number" min={1} max={2147483646} step={1} value={version} disabled={busy||done} onChange={e=>{setVersion(e.target.value);setConfirmed(false);}} required/></label>
  <label>Шешім <select value={decision} disabled={busy||done} onChange={e=>{setDecision(e.target.value as 'APPROVE'|'REJECT');setConfirmed(false);}}>
   <option value="REJECT">Бас тарту</option><option value="APPROVE">Мақұлдау</option>
  </select></label>
  <label><input type="checkbox" checked={confirmed} disabled={busy||done} onChange={e=>setConfirmed(e.target.checked)}/> Профиль мен шешімді тексердім</label>
  <button type="submit" disabled={!valid||!confirmed||busy||done}>{busy?'Жіберілуде…':'Шешімді тіркеу'}</button>
  <p role="status" aria-live="polite">{message}</p>
 </form>;
}
