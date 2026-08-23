import { env } from 'cloudflare:workers';
import Link from 'next/link';
import { requireChatGPTUser, chatGPTSignOutPath } from '../chatgpt-auth';
import AdminForm from './AdminForm';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireChatGPTUser('/admin');
  const isAdmin = Boolean(env.ADMIN_EMAIL) && user.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
  if (!isAdmin) {
    return <main className="admin-shell"><section className="admin-panel"><p className="eyebrow">ACCESS DENIED</p><h1>此帳號沒有管理權限</h1><p>{user.email}</p><Link className="text-link" href="/">返回暮光塔羅</Link></section></main>;
  }
  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <div className="admin-heading"><div><p className="eyebrow">PRIVATE SANCTUM</p><h1>AI 解牌設定</h1></div><a className="text-link" href={chatGPTSignOutPath('/admin')}>登出</a></div>
        <p className="admin-intro">設定 OpenAI 相容 API。新設定只有在連線測試成功後才會取代目前版本。</p>
        <AdminForm />
        <Link className="text-link back-home" href="/">← 返回前台</Link>
      </section>
    </main>
  );
}
