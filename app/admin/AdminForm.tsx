'use client';

import { useEffect, useState } from 'react';

type ConfigView = { baseUrl: string; model: string; hasApiKey: boolean; version: number; lastTestedAt: string | null };

export default function AdminForm() {
  const [config, setConfig] = useState<ConfigView | null>(null);
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/config').then(async (response) => {
      if (!response.ok) throw new Error('無法載入設定');
      return response.json() as Promise<ConfigView>;
    }).then((value) => {
      setConfig(value); setBaseUrl(value.baseUrl); setModel(value.model);
    }).catch((error: Error) => { setStatus('error'); setMessage(error.message); });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setStatus('saving'); setMessage('正在測試模型連線…');
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ baseUrl, model, apiKey }),
      });
      const value = await response.json() as ConfigView & { error?: string };
      if (!response.ok) throw new Error(value.error ?? '連線測試失敗');
      setConfig(value); setApiKey(''); setStatus('success'); setMessage('連線成功，設定已安全儲存。');
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : '設定失敗');
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label>API Base URL<input type="url" required value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.openai.com/v1" /></label>
      <label>模型名稱<input required value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-4.1-mini" autoComplete="off" /></label>
      <label>API Key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={config?.hasApiKey ? '已安全儲存；留白可保留原 Key' : '請輸入 API Key'} autoComplete="new-password" /></label>
      <div className="admin-note">Key 會在伺服器端加密，且不會回傳到瀏覽器。</div>
      <button className="draw-button admin-save" disabled={status === 'saving'} type="submit">{status === 'saving' ? '測試中…' : '測試並儲存'}</button>
      {message && <p className={`admin-status ${status}`} role="status">{message}</p>}
      {config?.lastTestedAt && <p className="last-tested">設定版本 {config.version} · 最近測試 {new Date(config.lastTestedAt).toLocaleString('zh-TW')}</p>}
    </form>
  );
}
