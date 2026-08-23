'use client';

/* eslint-disable @next/next/no-location-assign-relative-destination -- Hard navigation guarantees the new auth cookie reaches the server-rendered admin page. */

import { FormEvent, useState } from 'react';

export default function SetupForm({ resetting }: { resetting: boolean }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin/auth/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: form.get('username'),
          password: form.get('password'),
          passwordConfirmation: form.get('passwordConfirmation'),
        }),
      });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? '設定失敗');
      window.location.assign('/admin');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '設定失敗');
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label>管理員帳號<input name="username" autoComplete="username" required minLength={3} maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,39}" /></label>
      <p className="admin-note">3–40 字元，可使用英文字母、數字、句點、底線與連字號。</p>
      <label>管理員密碼<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={200} /></label>
      <label>再次輸入密碼<input name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={200} /></label>
      <p className="admin-note">至少 12 個字元。密碼只會以不可逆雜湊保存。</p>
      <button className="draw-button admin-save" type="submit" disabled={busy}>{busy ? '安全儲存中…' : resetting ? '重設管理員帳密' : '建立管理員帳密'}</button>
      {message && <p className="admin-status error" role="alert">{message}</p>}
    </form>
  );
}
