'use client';

/** Sanitized error boundary: never expose backend responses, tokens or stack traces. */
export default function ModerationError({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}>
  <section role="alert" style={{maxWidth:520,width:'100%',padding:32,border:'1px solid #dfe9eb',borderRadius:16,background:'#fff'}}>
   <h1>Бөлімді ашу мүмкін болмады</h1>
   <p>Сұрау аяқталмады. Қолжетімділік расталмаса, әкімшілік деректер көрсетілмейді.</p>
   <button type="button" onClick={reset} style={{padding:'10px 16px',borderRadius:10}}>
    Қайта көру
   </button>
  </section>
 </main>;
}
