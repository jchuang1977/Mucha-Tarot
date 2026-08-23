import type { Metadata } from 'next';
import { env } from 'cloudflare:workers';
import './globals.css';

const configuredOrigin = env.SITE_ORIGIN ?? 'http://localhost:3000';
const metadataBase = new URL(/^https?:\/\//.test(configuredOrigin) ? configuredOrigin : 'http://localhost:3000');

export const metadata: Metadata = {
  metadataBase,
  title: '暮光塔羅｜每日一張牌的指引',
  description: '在暮光裡靜心抽一張牌，透過 AI 獲得今日的溫柔指引。',
  icons: { icon: '/favicon.png' },
  openGraph: {
    title: '暮光塔羅', description: '在暮光裡，聽見今日的指引', images: [{ url: '/og.png', width: 1200, height: 630 }], locale: 'zh_TW', type: 'website',
  },
  twitter: { card: 'summary_large_image', title: '暮光塔羅', description: '在暮光裡，聽見今日的指引', images: ['/og.png'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
