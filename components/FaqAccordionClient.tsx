'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export interface FaqCategoryItem {
  category: string;
  q: string;
  a: string;
}

export function FaqAccordionClient({ items }: { items: FaqCategoryItem[] }) {
  const categories = ['الكل', ...Array.from(new Set(items.map((i) => i.category)))];
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filtered = activeCategory === 'الكل' ? items : items.filter((i) => i.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setActiveCategory(cat);
              setOpenIndex(0);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
              activeCategory === cat
                ? 'bg-[#10F5A6]/15 border-[#10F5A6]/45 text-[#10F5A6]'
                : 'bg-[#071124] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={item.q}
              className={`rounded-2xl border transition ${
                isOpen
                  ? 'bg-[#081632] border-[#10F5A6]/35'
                  : 'bg-[#071124] border-white/10 hover:border-white/20'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-right"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <HelpCircle className={`w-4 h-4 shrink-0 ${isOpen ? 'text-[#10F5A6]' : 'text-sky-400'}`} />
                  <span className="text-xs sm:text-sm font-bold text-white leading-snug">{item.q}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${
                    isOpen ? 'rotate-180 text-[#10F5A6]' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-white/5 text-xs text-slate-300 leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
