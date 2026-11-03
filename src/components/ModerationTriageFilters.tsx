'use client';

import type {TriageFilter} from '../lib/moderation-triage';

const copy={
  kk:{state:'Күйі',kind:'Нысан',all:'Барлығы',
    triage:'Алғашқы қарау',in_review:'Қаралуда',decision:'Шешім',
    appeal:'Шағым',closed:'Жабылды',
    professional:'Маман',organization:'Компания',review:'Пікір',affiliation:'Байланыс'},
  ru:{state:'Статус',kind:'Объект',all:'Все',
    triage:'Первичная проверка',in_review:'На рассмотрении',decision:'Решение',
    appeal:'Апелляция',closed:'Закрыто',
    professional:'Специалист',organization:'Компания',review:'Отзыв',affiliation:'Связь'},
} as const;

/** Parent must query a real, authorized API; this never grants wider visibility. */
export function ModerationTriageFilters({
  locale,value,onChange,
}:{
  locale:'kk'|'ru';value:TriageFilter;onChange:(next:TriageFilter)=>void;
}){
  const t=copy[locale];
  return <fieldset aria-label={locale==='kk'?'Модерация сүзгілері':'Фильтры модерации'}>
    <legend>{locale==='kk'?'Сүзгілер':'Фильтры'}</legend>
    <label htmlFor="triage-state">{t.state}</label>
    <select id="triage-state" value={value.state} onChange={e=>
      onChange({...value,state:e.target.value as TriageFilter['state']})}>
      {(['all','triage','in_review','decision','appeal','closed'] as const).map(x=>
        <option key={x} value={x}>{t[x]}</option>)}
    </select>
    <label htmlFor="triage-kind">{t.kind}</label>
    <select id="triage-kind" value={value.kind} onChange={e=>
      onChange({...value,kind:e.target.value as TriageFilter['kind']})}>
      {(['all','professional','organization','review','affiliation'] as const).map(x=>
        <option key={x} value={x}>{t[x]}</option>)}
    </select>
  </fieldset>;
}
