/* eslint-disable @next/next/no-html-link-for-pages -- A hard navigation is intentional for Sites auth-aware routing. */

import { redirect } from 'next/navigation';
import { getAdminSession } from '../../lib/admin';
import AdminForm from './AdminForm';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <div className="admin-heading">
          <div><p className="eyebrow">PRIVATE SANCTUM</p><h1>AI 解牌設定</h1></div>
          <form action="/api/admin/auth/logout" method="post"><button className="link-button" type="submit">登出</button></form>
        </div>
        <p className="admin-welcome">管理員：{session.username}</p>
        <p className="admin-intro">設定 OpenAI 相容 API。新設定只有在連線測試成功後才會取代目前版本。</p>
        <AdminForm />
        <a className="text-link back-home" href="/">← 返回前台</a>
      </section>
    </main>
  );
}
