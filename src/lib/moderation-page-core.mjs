const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const KINDS=new Set(['professional','organization','review','affiliation']);
const STATES=new Set(['triage','in_review','decision','appeal','closed']);
const KEYS=['id','subjectKind','state','createdAt'];

function validUtcTimestamp(text){
 if(typeof text!=='string'||!ISO.test(text))return false;
 const time=Date.parse(text);
 if(!Number.isFinite(time))return false;
 const date=new Date(time);
 return date.getUTCFullYear()===Number(text.slice(0,4))&&
  date.getUTCMonth()+1===Number(text.slice(5,7))&&
  date.getUTCDate()===Number(text.slice(8,10))&&
  date.getUTCHours()===Number(text.slice(11,13))&&
  date.getUTCMinutes()===Number(text.slice(14,16))&&
  date.getUTCSeconds()===Number(text.slice(17,19));
}

/**
 * Only accepts an already backend-authorized, redacted page.
 * This schema check protects rendering; it never grants data access.
 */
export function isSafeModerationCasePage(value,maxPageSize=50){
 if(!Array.isArray(value)||!Number.isSafeInteger(maxPageSize)||
  maxPageSize<1||maxPageSize>50||value.length>maxPageSize)return false;
 const seen=new Set();
 return value.every(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item)||
   Object.getPrototypeOf(item)!==Object.prototype||
   Object.keys(item).length!==KEYS.length||
   !KEYS.every(key=>Object.hasOwn(item,key))||
   typeof item.id!=='string'||!UUID.test(item.id)||
   typeof item.subjectKind!=='string'||!KINDS.has(item.subjectKind)||
   typeof item.state!=='string'||!STATES.has(item.state)||
   !validUtcTimestamp(item.createdAt))return false;
  const id=item.id.toLowerCase();
  if(seen.has(id))return false;
  seen.add(id);
  return true;
 });
}
