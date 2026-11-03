export const dynamic = 'force-dynamic';

/**
 * Admin workspace is fail-closed until dedicated admin session verification,
 * MFA, per-action authorization and audit logging have been implemented.
 * This screen never exposes moderation data or offers a fake login.
 */
export default function AdminUnavailable() {
  return <main className="page">
    <section className="panel" role="status">
      <div className="brand">Services <span>Admin</span></div>
      <div className="status"><span aria-hidden="true" className="dot" /> Restricted workspace</div>
      <h1>Әкімшілік панель әзірленуде</h1>
      <p>Қауіпсіз авторизация және администратор рұқсаттары іске қосылғаннан кейін ғана бұл бөлім ашылады.</p>
      <p lang="ru" className="translation">Административная панель будет доступна после настройки безопасного входа и проверки прав.</p>
      <small>Доступ к данным и операциям не предоставляется.</small>
    </section>
  </main>;
}
