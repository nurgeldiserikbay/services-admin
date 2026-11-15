/** Neutral loading state: never render session or moderation data before authorization. */
export default function ModerationLoading(){
 return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}>
  <section role="status" aria-live="polite" aria-busy="true"
   style={{maxWidth:520,width:'100%',padding:32,border:'1px solid #dfe9eb',borderRadius:16,background:'#fff'}}>
   <h1>Модерация бөлімі жүктелуде</h1>
   <p>Қолжетімділік пен деректер тексеріліп жатыр.</p>
  </section>
 </main>;
}
