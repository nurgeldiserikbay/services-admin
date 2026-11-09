/** Unknown admin routes must never reveal internal resources or navigation. */
export default function AdminNotFound(){
  return <main className="page">
    <section className="panel" role="status">
      <div className="brand">Services <span>Admin</span></div>
      <h1>Бет табылмады</h1>
      <p>Бұл әкімшілік маршрут қолжетімсіз.</p>
      <p lang="ru" className="translation">Административный раздел недоступен.</p>
    </section>
  </main>;
}
