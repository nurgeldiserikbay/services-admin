'use client';

import {useState} from 'react';

/** No bearer tokens enter this component; browser sends only HttpOnly cookie. */
export function AdminLogoutButton(){
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(false);
 async function signOut(){
  if(busy)return;
  setBusy(true);
  setError(false);
  try{
   const response=await fetch('/api/auth/logout',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{Accept:'application/json'},
    redirect:'error',
   });
   if(response.status!==200)throw new Error('logout_failed');
   window.location.replace('/');
  }catch{
   setError(true);
   setBusy(false);
  }
 }
 return <div>
  <button type="button" disabled={busy} onClick={signOut}
   style={{padding:'10px 16px',borderRadius:10,cursor:busy?'wait':'pointer'}}>
   {busy?'Шығу орындалуда…':'Жүйеден шығу'}
  </button>
  {error&&<p role="alert">Шығу аяқталмады. Қайта көріңіз.</p>}
 </div>;
}
