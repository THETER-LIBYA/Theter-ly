'use client';

import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';

export function ContactFormClient() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, subject, message }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'تعذر إرسال الرسالة');
        return;
      }
      setSent(true);
      setName('');
      setPhone('');
      setSubject('');
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl bg-emerald-500/15 border border-[#10F5A6]/35 p-4 text-xs text-[#10F5A6] font-semibold">
        تم استلام رسالتك بنجاح، سيتواصل معك فريق الدعم الفني في أقرب وقت.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-white/10">
      <h2 className="text-sm font-bold text-white">أرسل رسالة مباشرة لفريق الدعم</h2>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="الاسم الكامل"
          className="rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white"
        />
        <input
          type="tel"
          required
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0910001234"
          className="rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white text-left"
        />
      </div>
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="الموضوع (مثال: متابعة طلب شراء)"
        className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white"
      />
      <textarea
        required
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="اكتب رسالتك هنا..."
        className="w-full rounded-xl bg-[#071124] border border-white/15 px-3.5 py-2.5 text-sm text-white"
      />
      <button
        type="submit"
        disabled={sending}
        className="px-6 py-3 rounded-xl bg-[#10F5A6] text-slate-950 font-extrabold text-sm inline-flex items-center gap-2"
      >
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        <span>إرسال الرسالة</span>
      </button>
    </form>
  );
}
