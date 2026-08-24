'use client';

/* eslint-disable @next/next/no-img-element -- Tarot assets are pre-optimized WebP files and GSAP animates the image nodes directly. */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { ReadingContent, TarotReading } from '../lib/types';

type Phase = 'idle' | 'shuffling' | 'interpreting' | 'revealing' | 'ready' | 'error';
type ExtensionState = { status: 'loading' | 'ready' | 'error'; content?: string };
const sections: { key: keyof ReadingContent; label: string; symbol: string }[] = [
  { key: 'theme', label: '今日主題', symbol: '✦' }, { key: 'relationships', label: '感情人際', symbol: '♡' },
  { key: 'workAndMoney', label: '工作財運', symbol: '◇' }, { key: 'action', label: '行動建議', symbol: '☼' },
  { key: 'reminder', label: '今日提醒', symbol: '☾' },
];

function errorCopy(error: TarotReading['error']) {
  if (error === 'not_configured') return '解牌服務仍在準備中。牌已為你保留，待管理員完成 AI 設定後即可重新解牌。';
  if (error === 'invalid_response') return '這次的牌意沒有形成完整訊息，請為同一張牌重新解讀。';
  return '連線暫時受到星霧干擾，請稍後為同一張牌重新解讀。';
}

export default function TarotExperience({ formattedDate, viewer, authHref }: {
  formattedDate: string;
  viewer: { displayName: string; email: string } | null;
  authHref: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<TarotReading | null>(null);
  const [extensions, setExtensions] = useState<Partial<Record<keyof ReadingContent, ExtensionState>>>({});
  const [shareMessage, setShareMessage] = useState('');
  const [isCardZoomed, setIsCardZoomed] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add({ reduceMotion: '(prefers-reduced-motion: reduce)', desktop: '(min-width: 800px)' }, (context) => {
      const reduce = Boolean(context.conditions?.reduceMotion);
      gsap.from('.intro-item', { y: reduce ? 0 : 18, autoAlpha: 0, duration: reduce ? 0.01 : 0.75, stagger: reduce ? 0 : 0.11, ease: 'power2.out' });
      if (!reduce) gsap.to('.halo', { rotation: 360, duration: 38, repeat: -1, ease: 'none' });
    }, root);
    return () => { timelineRef.current?.kill(); mm.revert(); };
  }, []);

  useLayoutEffect(() => {
    const zoom = zoomRef.current;
    if (!zoom || !isCardZoomed) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const context = gsap.context(() => {
      gsap.fromTo(zoom, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduce ? .01 : .2 });
      gsap.fromTo(zoom.querySelector('.card-zoom-content'), { scale: reduce ? 1 : .92, y: reduce ? 0 : 18 }, {
        scale: 1, y: 0, duration: reduce ? .01 : .42, ease: 'power3.out',
      });
    }, zoom);
    return () => context.revert();
  }, [isCardZoomed]);

  useEffect(() => {
    if (!isCardZoomed) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsCardZoomed(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isCardZoomed]);

  async function fetchReading(retry?: TarotReading) {
    const response = await fetch('/api/draw', {
      method: 'POST', headers: retry ? { 'content-type': 'application/json' } : undefined,
      body: retry ? JSON.stringify({ cardId: retry.card.id, orientation: retry.orientation }) : undefined,
    });
    if (!response.ok) throw new Error('draw_failed');
    return response.json() as Promise<TarotReading>;
  }

  function shuffleAnimation() {
    const root = rootRef.current;
    if (!root) return Promise.resolve();
    const cards = root.querySelectorAll('.deck-card');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return Promise.resolve();
    timelineRef.current?.kill();
    return new Promise<void>((resolve) => {
      timelineRef.current = gsap.timeline({ defaults: { ease: 'power3.inOut' }, onComplete: resolve })
        .addLabel('scatter')
        .to(cards, { x: (index) => (index - 3) * 42, y: (index) => Math.abs(index - 3) * 8, rotation: (index) => (index - 3) * 8, duration: .65, stagger: { amount: .18, from: 'center' }, overwrite: 'auto' }, 'scatter')
        .to(cards, { x: 0, y: (index) => (6 - index) * -1.3, rotation: 0, duration: .62, stagger: { amount: .15, from: 'edges' } }, '+=.08');
    });
  }

  async function draw() {
    if (phase === 'shuffling' || phase === 'interpreting' || phase === 'revealing') return;
    setResult(null); setExtensions({}); setShareMessage(''); setIsCardZoomed(false); setPhase('shuffling');
    const readingPromise = fetchReading();
    await shuffleAnimation();
    setPhase('interpreting');
    try { reveal(await readingPromise); } catch { setPhase('error'); }
  }

  function reveal(value: TarotReading) {
    setResult(value); setPhase('revealing');
    requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const card = root.querySelector('.revealed-card');
      const backFace = root.querySelector('.card-back-face');
      const frontFace = root.querySelector('.card-front-face');
      const deck = root.querySelectorAll('.deck-card');
      const readingItems = root.querySelectorAll('.reading-section, .reading-footer, .error-reading');
      if (!card || !backFace || !frontFace) return;
      timelineRef.current?.kill();
      const timeline = gsap.timeline({ defaults: { ease: 'power2.out' }, onComplete: () => setPhase(value.reading ? 'ready' : 'error') })
        .set(card, { autoAlpha: 1, y: reduce ? 0 : 32, scale: reduce ? 1 : .92 })
        .set(backFace, { autoAlpha: 1, rotationY: 0 })
        .set(frontFace, { autoAlpha: 0, rotationY: reduce ? 0 : -90 })
        .to(deck, { autoAlpha: 0, scale: .9, duration: reduce ? .01 : .35, stagger: .03 })
        .to(card, { y: 0, scale: 1, duration: reduce ? .01 : .45 }, '<');
      if (reduce) {
        timeline.set(backFace, { autoAlpha: 0 }).set(frontFace, { autoAlpha: 1, rotationY: 0 });
      } else {
        timeline
          .to(backFace, { rotationY: 90, autoAlpha: 0, duration: .42, ease: 'power2.in' }, '+=.05')
          .set(frontFace, { autoAlpha: 1 })
          .to(frontFace, { rotationY: 0, duration: .48, ease: 'power2.out' });
      }
      timeline.fromTo(readingItems, { autoAlpha: 0, y: reduce ? 0 : 14 }, { autoAlpha: 1, y: 0, duration: reduce ? .01 : .48, stagger: reduce ? 0 : .1 }, '-=.15');
      timelineRef.current = timeline;
    });
  }

  async function retry() {
    if (!result) return;
    setPhase('interpreting');
    try { reveal(await fetchReading(result)); } catch { setPhase('error'); }
  }

  function redraw() {
    const card = rootRef.current?.querySelector('.revealed-card');
    if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches) { void draw(); return; }
    timelineRef.current?.kill();
    timelineRef.current = gsap.timeline({ onComplete: () => void draw() })
      .to(card, { y: 30, scale: .92, autoAlpha: 0, duration: .5, ease: 'power2.in' });
  }

  async function extendReading(section: keyof ReadingContent) {
    if (!result?.reading || extensions[section]?.status === 'loading' || extensions[section]?.status === 'ready') return;
    setExtensions((current) => ({ ...current, [section]: { status: 'loading' } }));
    try {
      const response = await fetch('/api/extend-reading', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cardId: result.card.id, orientation: result.orientation, date: result.date, section }),
      });
      const payload = await response.json() as { content?: unknown };
      if (!response.ok || typeof payload.content !== 'string') throw new Error('extend_failed');
      setExtensions((current) => ({ ...current, [section]: { status: 'ready', content: payload.content } }));
    } catch {
      setExtensions((current) => ({ ...current, [section]: { status: 'error' } }));
    }
  }

  async function shareResult() {
    if (!result?.reading) return;
    const lines = sections.map((section) => `${section.label}\n${result.reading?.[section.key] ?? ''}`);
    const text = `暮光塔羅 · ${result.date}\n${result.card.nameZh} ${result.card.nameEn} · ${result.orientation === 'upright' ? '正位' : '逆位'}\n\n${lines.join('\n\n')}\n\n內容僅供自我探索與娛樂。`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `暮光塔羅｜${result.card.nameZh}`, text, url: window.location.href });
        setShareMessage('已開啟分享');
      } else {
        await navigator.clipboard.writeText(text);
        setShareMessage('占卜結果已複製');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(text);
        setShareMessage('占卜結果已複製');
      } catch {
        setShareMessage('無法自動分享，請稍後再試');
      }
    }
  }

  const busy = phase === 'shuffling' || phase === 'interpreting' || phase === 'revealing';
  return (
    <main className={`oracle-shell phase-${phase}`} ref={rootRef}>
      <div className="stars" aria-hidden="true" />
      <header className="brand-bar intro-item">
        <span className="brand-mark" aria-hidden="true">✦</span>
        <span>暮光塔羅</span>
        <nav className="brand-actions" aria-label="帳號與管理">
          {viewer && <span className="viewer-name" title={viewer.email}>{viewer.displayName}</span>}
          <a href={authHref} className="user-auth-link">{viewer ? '登出' : 'ChatGPT 登入'}</a>
          <a href="/admin" className="admin-link">管理</a>
        </nav>
      </header>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow intro-item">A MOMENT FOR YOURSELF</p>
          <h1 className="intro-item" id="page-title">在暮光裡，聽見今日的指引</h1>
          <p className="date-line intro-item">{formattedDate}</p>
        </div>
        <div className={`experience-zone ${result ? 'has-result' : ''}`}>
          <div className="draw-column">
            <div className="deck-stage intro-item" aria-label={result ? `${result.card.nameZh}${result.orientation === 'reversed' ? '逆位' : '正位'}` : '等待抽取的塔羅牌堆'}>
              <div className="halo" aria-hidden="true" />
              <div className="card-stack" aria-hidden="true">
                {Array.from({ length: 7 }, (_, index) => <img className="deck-card" key={index} src="/assets/tarot/card-back.png" alt="" />)}
              </div>
              {result && <button className="revealed-card" type="button" onClick={() => setIsCardZoomed(true)} disabled={busy} aria-label={`放大查看${result.card.nameZh}正位牌面`}>
                <div className="card-face card-back-face"><img src="/assets/tarot/card-back.png" alt="" /></div>
                <div className="card-face card-front-face"><img className={`card-front-image ${result.orientation === 'reversed' ? 'is-reversed' : ''}`} src={result.card.imageUrl} alt="" /></div>
              </button>}
            </div>
            {!result && <button className="draw-button intro-item" type="button" disabled={busy} onClick={draw}><span>{phase === 'idle' ? '靜心抽一張' : phase === 'shuffling' ? '正在洗牌…' : '正在聆聽牌意…'}</span><span aria-hidden="true">✦</span></button>}
            {!result && <p className="invitation intro-item">閉上眼睛，深呼吸，讓直覺替你選擇。</p>}
            {result && <div className="card-caption"><p>{result.card.nameZh}</p><span>{result.card.nameEn} · {result.orientation === 'upright' ? '正位' : '逆位'}</span></div>}
          </div>

          {result && <article className="reading-panel" aria-live="polite">
            <div className="reading-heading"><p className="eyebrow">TODAY&apos;S GUIDANCE</p><h2>今日牌訊</h2><span>{result.date}{result.cached ? ' · 今日共鳴' : ''}</span></div>
            {result.reading ? <div className="reading-list">{sections.map((section) => {
              const extension = extensions[section.key];
              return <section className="reading-section" key={section.key}><span aria-hidden="true">{section.symbol}</span><div><h3>{section.label}</h3><p>{result.reading?.[section.key]}</p>
                {extension?.status === 'ready' && <p className="extension-content">{extension.content}</p>}
                {extension?.status === 'error' && <p className="extension-error">星霧暫時干擾了延伸解讀，請稍後再試。</p>}
                <button className="extend-button" type="button" onClick={() => void extendReading(section.key)} disabled={extension?.status === 'loading' || extension?.status === 'ready' || busy}>
                  {extension?.status === 'loading' ? '正在延伸解讀…' : extension?.status === 'ready' ? '已展開延伸解讀' : extension?.status === 'error' ? '重新延伸解讀' : '延伸解讀'}
                </button>
              </div></section>;
            })}</div>
              : <div className="error-reading"><span aria-hidden="true">☾</span><p>{errorCopy(result.error)}</p><button type="button" onClick={retry} disabled={busy}>重新解牌</button></div>}
            {result.reading && <div className="reading-footer"><div className="reading-footer-actions"><button type="button" onClick={redraw} disabled={busy}>再抽一張</button><button type="button" onClick={() => void shareResult()} disabled={busy}>分享結果</button></div><span>{shareMessage || '讓下一個當下，帶來新的看見'}</span></div>}
          </article>}
        </div>
        {phase === 'interpreting' && <div className="interpreting-status" role="status"><span aria-hidden="true">✦</span> 正在聆聽牌意…</div>}
      </section>
      {result && isCardZoomed && <div className="card-zoom-backdrop" ref={zoomRef} role="dialog" aria-modal="true" aria-label={`${result.card.nameZh}正位牌面`} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCardZoomed(false); }}>
        <div className="card-zoom-content">
          <button className="card-zoom-close" type="button" onClick={() => setIsCardZoomed(false)} aria-label="關閉牌面放大">×</button>
          <img src={result.card.imageUrl} alt={`${result.card.nameZh} ${result.card.nameEn} 正位牌面`} />
          <p>{result.card.nameZh} · 正位牌面</p>
        </div>
      </div>}
      <footer>內容僅供自我探索與娛樂，不替代專業建議。</footer>
    </main>
  );
}
