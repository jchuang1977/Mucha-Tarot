'use client';

/* eslint-disable @next/next/no-location-assign-relative-destination -- Hard navigation guarantees the new auth cookie reaches the server-rendered admin page. */

import { FormEvent, useState } from 'react';

export default function LoginForm() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? '登入失敗');
      window.location.assign('/admin');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '登入失敗');
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label>管理員帳號<input name="username" autoComplete="username" required minLength={3} maxLength={40} /></label>
      <label>管理員密碼<input name="password" type="password" autoComplete="current-password" required minLength={12} maxLength={200} /></label>
      <button className="draw-button admin-save" type="submit" disabled={busy}>{busy ? '驗證中…' : '登入後台'}</button>
      {message && <p className="admin-status error" role="alert">{message}</p>}
    </form>
  );
}
