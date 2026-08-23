import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';

export async function getAdminUser() {
  const user = await getChatGPTUser();
  if (!user || !env.ADMIN_EMAIL) return null;
  return user.email.trim().toLowerCase() === env.ADMIN_EMAIL.trim().toLowerCase() ? user : null;
}
