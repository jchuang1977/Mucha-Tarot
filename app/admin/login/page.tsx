/* eslint-disable @next/next/no-html-link-for-pages -- A hard navigation is intentional for Sites auth-aware routing. */

import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../lib/admin';
import { getAdminCredential } from '../../../lib/database';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect('/admin');
  const configured = Boolean(await getAdminCredential());

  return (
    <main className="admin-shell">
      <section className="admin-panel admin-auth-panel">
        <p className="eyebrow">PRIVATE SANCTUM</p>
        <h1>管理員登入</h1>
        <p className="admin-intro">使用暮光塔羅專用帳號與密碼登入，不需要以 ChatGPT 帳號管理後台。</p>
        {configured ? <LoginForm /> : (
          <div className="setup-notice">
            <p>尚未建立管理員帳密。請由網站擁有者先完成安全初始化。</p>
            <a className="text-link" href="/admin/setup">建立管理員帳密</a>
          </div>
        )}
        <a className="text-link back-home" href="/">← 返回前台</a>
      </section>
    </main>
  );
}
