/* eslint-disable @next/next/no-html-link-for-pages -- A hard navigation is intentional for Sites auth-aware routing. */

import { env } from 'cloudflare:workers';
import { getAdminCredential } from '../../../lib/database';
import { requireChatGPTUser, chatGPTSignOutPath } from '../../chatgpt-auth';
import SetupForm from './SetupForm';

export const dynamic = 'force-dynamic';

export default async function AdminSetupPage() {
  const user = await requireChatGPTUser('/admin/setup');
  const ownerEmail = env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!ownerEmail || user.email.trim().toLowerCase() !== ownerEmail) {
    return (
      <main className="admin-shell"><section className="admin-panel admin-auth-panel">
        <p className="eyebrow">ACCESS DENIED</p><h1>無法初始化後台</h1>
        <p className="admin-intro">只有網站擁有者能建立或重設管理員帳密。</p>
        <a className="text-link" href={chatGPTSignOutPath('/admin/setup')}>切換 ChatGPT 帳號</a>
        <a className="text-link back-home" href="/">← 返回前台</a>
      </section></main>
    );
  }
  const credential = await getAdminCredential();
  return (
    <main className="admin-shell">
      <section className="admin-panel admin-auth-panel">
        <p className="eyebrow">OWNER SETUP</p>
        <h1>{credential ? '重設管理員帳密' : '建立管理員帳密'}</h1>
        <p className="admin-intro">已由 ChatGPT 驗證網站擁有者：{user.email}。設定完成後，日常後台登入只使用下方帳密。</p>
        <SetupForm resetting={Boolean(credential)} />
        <a className="text-link back-home" href="/">← 返回前台</a>
      </section>
    </main>
  );
}
