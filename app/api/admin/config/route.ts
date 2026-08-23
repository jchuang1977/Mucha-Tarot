import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getAdminUser } from '../../../../lib/admin';
import { decryptSecret, encryptSecret, validateProviderBaseUrl } from '../../../../lib/crypto';
import { getAiConfig, saveAiConfig } from '../../../../lib/database';
import { testProvider } from '../../../../lib/provider';

export const dynamic = 'force-dynamic';

function unauthorized() { return NextResponse.json({ error: 'unauthorized' }, { status: 403 }); }

export async function GET() {
  if (!(await getAdminUser())) return unauthorized();
  const config = await getAiConfig();
  return NextResponse.json(config ? {
    baseUrl: config.base_url, model: config.model, hasApiKey: true,
    version: config.version, lastTestedAt: config.last_tested_at,
  } : { baseUrl: 'https://api.openai.com/v1', model: '', hasApiKey: false, version: 0, lastTestedAt: null });
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json() as { baseUrl?: unknown; model?: unknown; apiKey?: unknown };
    if (typeof body.baseUrl !== 'string' || typeof body.model !== 'string' || typeof body.apiKey !== 'string') {
      return NextResponse.json({ error: '請完整填寫設定' }, { status: 400 });
    }
    const baseUrl = validateProviderBaseUrl(body.baseUrl.trim());
    const model = body.model.trim();
    if (!model || model.length > 160 || !/^[\w./:@+-]+$/.test(model)) {
      return NextResponse.json({ error: '模型名稱格式不正確' }, { status: 400 });
    }

    const current = await getAiConfig();
    const apiKey = body.apiKey.trim() || (current
      ? await decryptSecret(current.api_key_ciphertext, current.api_key_iv, env.CONFIG_ENCRYPTION_KEY)
      : '');
    if (!apiKey) return NextResponse.json({ error: '請輸入 API Key' }, { status: 400 });

    await testProvider({ baseUrl, model, apiKey });
    const encrypted = await encryptSecret(apiKey, env.CONFIG_ENCRYPTION_KEY);
    const version = await saveAiConfig({ baseUrl, model, ...encrypted, updatedBy: user.email });
    return NextResponse.json({ ok: true, baseUrl, model, hasApiKey: true, version, lastTestedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error && !/Provider request failed/.test(error.message)
      ? error.message : '連線測試失敗，請檢查網址、模型與 API Key';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
