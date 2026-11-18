'use client';

import {useState} from 'react';
import type {ModerationCase} from '@/lib/admin-backend.server';
import styles from './ModerationQueue.module.css';
import {ModerationDecisionForm} from './ModerationDecisionForm';

const labels={
  professional:'Маман',organization:'Компания',review:'Пікір',affiliation:'Байланыс',
} as const;
const states={
  triage:'Алғашқы тексеру',in_review:'Қаралуда',decision:'Шешім',
  appeal:'Шағым',closed:'Жабылды',
} as const;

/**
 * Read-only, client-filterable view of backend-authorized cases. Data must be obtained by an authenticated
 * server BFF after session/MFA/scope verification; never pass bearer to props.
 * This component deliberately performs no fetch and grants no permissions.
 */
export function ModerationQueue({items,decisionCsrf=null}:{items:readonly ModerationCase[];decisionCsrf?:string|null}){
  const [query,setQuery]=useState('');
  const [kind,setKind]=useState('all');
  const [state,setState]=useState('all');
  const [order,setOrder]=useState<'newest'|'oldest'>('newest');
  const normalizedQuery=query.trim().toLowerCase();
  const visible=items.filter(item=>(kind==='all'||item.subjectKind===kind)&&
    (state==='all'||item.state===state)&&
    (normalizedQuery===''||item.id.toLowerCase().includes(normalizedQuery))).sort((a,b)=>{
      const byDate=Date.parse(a.createdAt)-Date.parse(b.createdAt);
      const ordered=order==='newest'?-byDate:byDate;
      return ordered||a.id.localeCompare(b.id);
    });
  return <section className={styles.queue} aria-labelledby="moderation-heading">
    <div className={styles.heading}>
      <div>
        <p className={styles.eyebrow}>Services Admin</p>
        <h1 id="moderation-heading">Модерация кезегі</h1>
      </div>
      <span className={styles.count} aria-label={`Осы беттегі жазба саны: ${items.length}`}>
        {items.length} жазба (осы бет)
      </span>
    </div>
    <p className={styles.scopeNote}>Бұл тек ағымдағы рұқсат етілген бет. Жалпы кезек саны мен басқа жазбалар көрсетілмейді. Шешім тек рұқсат етілген модерация ісінде және нақты профиль нұсқасы расталғанда қабылданады.</p>
    {items.length>0&&<div className={styles.filters}>
      <label className={styles.filterLabel}>Жазба ID іздеу <input className={styles.filterSelect} type="search" aria-label="Осы беттегі жазба ID бойынша іздеу" autoComplete="off" maxLength={36} value={query} onChange={event=>setQuery(event.target.value)} placeholder="UUID немесе оның бөлігі" /></label>
      <label className={styles.filterLabel}>Түрі <select className={styles.filterSelect} aria-label="Жазба түрі бойынша сүзгі" value={kind} onChange={event=>setKind(event.target.value)}>
        <option value="all">Барлығы</option>
        {Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className={styles.filterLabel}>Күйі <select className={styles.filterSelect} aria-label="Жазба күйі бойынша сүзгі" value={state} onChange={event=>setState(event.target.value)}>
        <option value="all">Барлығы</option>
        {Object.entries(states).map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className={styles.filterLabel}>Уақыты <select className={styles.filterSelect} aria-label="Тіркелген уақыты бойынша сұрыптау" value={order} onChange={event=>setOrder(event.target.value as 'newest'|'oldest')}>
        <option value="newest">Алдымен жаңалары</option>
        <option value="oldest">Алдымен ескілері</option>
      </select></label>
      {(query!==''||kind!=='all'||state!=='all'||order!=='newest')&&<button className={styles.filterReset} type="button" onClick={()=>{setQuery('');setKind('all');setState('all');setOrder('newest');}}>
        Сүзгілерді тазалау
      </button>}
    </div>}
    {items.length>0&&<p className={styles.resultCount} role="status" aria-live="polite" aria-atomic="true">Осы бетте {visible.length} / {items.length} жазба көрсетілуде.</p>}
    {items.length===0?
      <p className={styles.empty} role="status">Бұл бетте көрсетілетін жазба жоқ. Басқа рұқсат етілген жазбалар болуы мүмкін.</p>:
      visible.length===0?<p className={styles.empty} role="status">Бұл бетте таңдалған сүзгілерге сәйкес жазба жоқ.</p>:
      <div className={styles.scroll} role="region" aria-label="Модерация жазбалары кестесі" tabIndex={0}>
        <table className={styles.table}>
          <caption className={styles.caption}>Осы беттегі сүзгіден өткен {visible.length} модерация жазбасы</caption>
          <thead><tr><th scope="col">Түрі</th><th scope="col">Күйі</th>
            <th scope="col">Тіркелген уақыты</th><th scope="col">ID</th>{decisionCsrf&&<th scope="col">Әрекет</th>}</tr></thead>
          <tbody>{visible.map(item=><tr key={item.id}>
            <td>{labels[item.subjectKind]}</td>
            <td><span className={styles.state}>{states[item.state]}</span></td>
            <td><time dateTime={item.createdAt}>
              {new Date(item.createdAt).toLocaleString('kk-KZ',{timeZone:'UTC'})} UTC
            </time></td>
            <td><code className={styles.caseId} aria-label={`Жазба идентификаторы: ${item.id}`}>{item.id}</code></td>
            {decisionCsrf&&<td>{item.subjectKind==='professional'&&item.state==='decision'?<ModerationDecisionForm caseId={item.id} csrf={decisionCsrf}/>:null}</td>}
          </tr>)}</tbody>
        </table>
      </div>}
  </section>;
}
