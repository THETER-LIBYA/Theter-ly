'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Maximize2,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export interface ViewerDocument {
  title: string;
  subtitle?: string;
  url: string;
}

export function AdminDocumentViewerModal({
  documents,
  initialIndex = 0,
  open,
  onClose,
}: {
  documents: ViewerDocument[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || documents.length === 0) return null;

  const docKey = `${initialIndex}:${documents.map((d) => d.url).join('|')}`;
  return (
    <AdminDocumentViewerModalBody
      key={docKey}
      documents={documents}
      initialIndex={initialIndex}
      onClose={onClose}
    />
  );
}

function AdminDocumentViewerModalBody({
  documents,
  initialIndex,
  onClose,
}: {
  documents: ViewerDocument[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const current = documents[activeIndex] || documents[0];
  const isPdf = current.url.toLowerCase().split('?')[0].endsWith('.pdf');

  const switchDoc = (idx: number) => {
    setActiveIndex(idx);
    setZoom(1);
    setRotation(0);
    setLoading(true);
    setLoadError(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-[#081226] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#040B1A]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-[#10F5A6]/30 flex items-center justify-center text-[#10F5A6] shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                {current.title}
              </h3>
              {current.subtitle && (
                <p className="text-[11px] text-slate-400 truncate">{current.subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {!isPdf && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  title="تصغير"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[11px] font-mono text-slate-300 tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  title="تكبير"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="تدوير 90 درجة"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  title="إعادة الضبط"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <a
              href={current.url}
              download
              className="px-2.5 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 text-[11px] font-bold inline-flex items-center gap-1 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              title="إغلاق المعاينة"
              className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-document Quick Tabs */}
        {documents.length > 1 && (
          <div className="px-4 py-2 border-b border-white/10 bg-[#071124] flex flex-wrap gap-2">
            {documents.map((doc, idx) => (
              <button
                key={`${doc.url}-${idx}`}
                type="button"
                onClick={() => switchDoc(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  idx === activeIndex
                    ? 'bg-[#10F5A6] text-slate-950'
                    : 'bg-white/5 text-slate-300 hover:text-white'
                }`}
              >
                {doc.title}
              </button>
            ))}
          </div>
        )}

        {/* Document Viewport */}
        <div className="flex-1 overflow-auto bg-[#020611] p-4 flex items-center justify-center min-h-[55vh]">
          {isPdf ? (
            <iframe
              src={current.url}
              title={current.title}
              className="w-full h-[68vh] rounded-xl bg-white border border-white/10"
            />
          ) : (
            <div className="relative flex items-center justify-center w-full h-full">
              {loading && !loadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[#10F5A6]" />
                  <span>جاري تحميل المستند بشكل آمن...</span>
                </div>
              )}

              {loadError ? (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-400/30 p-6 text-center space-y-2 max-w-sm">
                  <AlertCircle className="w-7 h-7 text-rose-300 mx-auto" />
                  <p className="text-xs text-rose-200 font-bold">
                    تعذر عرض الصورة داخل المعاينة المباشرة
                  </p>
                  <p className="text-[11px] text-slate-400">
                    يمكنك الضغط على زر «تنزيل» بالأعلى لحفظ الملف ومشاهدته على جهازك.
                  </p>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.url}
                  alt={current.title}
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setLoadError(true);
                  }}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                  className="max-h-[68vh] max-w-full rounded-xl object-contain transition-transform duration-200 shadow-lg border border-white/10"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
