'use client';

/* eslint-disable @next/next/no-img-element -- Tarot artwork is served as pre-optimized WebP. */

import { useLayoutEffect, useState } from 'react';
import gsap from 'gsap';
import { tarotDeck } from '../lib/tarot';
import type { TarotCard } from '../lib/types';

type Filter = 'all' | 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: '完整牌組' }, { value: 'major', label: '大阿爾克那' },
  { value: 'wands', label: '權杖' }, { value: 'cups', label: '聖杯' },
  { value: 'swords', label: '寶劍' }, { value: 'pentacles', label: '錢幣' },
];

export default function CardsGallery() {
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<TarotCard | null>(null);
  const cards = tarotDeck.filter((card) => filter === 'all' || card.suit === filter);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: reduce)', () => { gsap.set('.gallery-item', { autoAlpha: 1, y: 0 }); });
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.gallery-item', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .42, stagger: .025, ease: 'power2.out' });
    });
    return () => mm.revert();
  }, [filter]);

  return (
    <main className="gallery-shell">
      <div className="stars" aria-hidden="true" />
      <header className="brand-bar gallery-header"><span className="brand-mark" aria-hidden="true">✦</span><span>暮光塔羅</span><a href="/" className="admin-link">返回抽牌</a></header>
      <section className="gallery-hero" aria-labelledby="gallery-title"><p className="eyebrow">THE ARCANA COLLECTION</p><h1 id="gallery-title">牌面欣賞</h1><p>慢慢觀看每一張牌的象徵與筆觸，讓直覺在圖像裡停留。</p></section>
      <nav className="gallery-filters" aria-label="牌組篩選">{filters.map((item) => <button key={item.value} type="button" className={filter === item.value ? 'is-active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}</nav>
      <section className="card-gallery" aria-label={`${cards.length} 張塔羅牌`}>
        {cards.map((card) => <button className="gallery-item" type="button" key={card.id} onClick={() => setSelected(card)} aria-label={`欣賞${card.nameZh}正位牌面`}><span className="gallery-card-frame"><img src={card.imageUrl} alt={`${card.nameZh} ${card.nameEn} 正位牌面`} /></span><span className="gallery-card-name">{card.nameZh}</span><span className="gallery-card-en">{card.nameEn}</span></button>)}
      </section>
      <footer>內容僅供自我探索與娛樂，不替代專業建議。</footer>
      {selected && <div className="card-zoom-backdrop gallery-modal" role="dialog" aria-modal="true" aria-label={`${selected.nameZh}正位牌面`} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><div className="card-zoom-content"><button className="card-zoom-close" type="button" onClick={() => setSelected(null)} aria-label="關閉牌面放大">×</button><img src={selected.imageUrl} alt={`${selected.nameZh} ${selected.nameEn} 正位牌面`} /><p>{selected.nameZh} · {selected.nameEn}</p></div></div>}
    </main>
  );
}
