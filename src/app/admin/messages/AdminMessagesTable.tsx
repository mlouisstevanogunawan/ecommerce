'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, MailOpen, AlertCircle, Inbox, Package } from 'lucide-react';
import { ContactMessage, ContactMessageStatus } from '@/lib/types';
import { formatDate } from '@/lib/utils';

type Notice = { kind: 'ok' | 'err'; text: string } | null;
type Filter = 'unread' | 'read' | 'all';

export function AdminMessagesTable({ messages: initial }: { messages: ContactMessage[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ContactMessage[]>(initial);
  const [filter, setFilter] = useState<Filter>('unread');
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const unreadCount = useMemo(() => messages.filter((m) => m.status === 'unread').length, [messages]);
  const shown = useMemo(
    () => (filter === 'all' ? messages : messages.filter((m) => m.status === filter)),
    [messages, filter],
  );

  async function setStatus(message: ContactMessage, status: ContactMessageStatus) {
    setBusyId(message.id);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: message.id, status }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success !== true) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, status } : m)));
      setNotice({ kind: 'ok', text: `Marked “${message.name}’s message” as ${status}.` });
      router.refresh();
    } catch (err: unknown) {
      setNotice({
        kind: 'err',
        text: err instanceof Error ? err.message : 'The status change was not saved. The list still shows the old state.',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand" />
            Support Inbox
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Every message sent through the public contact form lands here. {unreadCount} unread.
          </p>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Filter messages by status">
          {(['unread', 'read', 'all'] as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`px-3 py-1.5 rounded text-xs font-bold capitalize transition-colors ${
                filter === key ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite">
        {notice && (
          <div
            role={notice.kind === 'err' ? 'alert' : 'status'}
            className={`mb-4 flex items-center gap-2 rounded border p-3 text-xs font-semibold ${
              notice.kind === 'err'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{notice.text}</span>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="py-12 text-center">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-900">
            {filter === 'unread' && messages.length > 0
              ? 'Nothing is unread right now.'
              : `No ${filter === 'all' ? '' : filter} messages.`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {messages.length === 0
              ? 'This inbox is empty because nobody has submitted the contact form yet.'
              : 'Switch the filter to see the other messages.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((message) => (
            <li
              key={message.id}
              className={`rounded border p-4 ${
                message.status === 'unread' ? 'border-brand/40 bg-teal-50/40' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {message.subject || '(no subject)'}
                    {message.status === 'unread' && (
                      <span className="ml-2 align-middle inline-flex items-center rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                        UNREAD
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {message.name} ·{' '}
                    <a href={`mailto:${message.email}`} className="text-brand hover:underline break-all">
                      {message.email}
                    </a>{' '}
                    · {formatDate(message.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void setStatus(message, message.status === 'unread' ? 'read' : 'unread')}
                  disabled={busyId === message.id}
                  className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {message.status === 'unread' ? (
                    <>
                      <MailOpen className="w-3.5 h-3.5" /> Mark as handled
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" /> Mark as unread
                    </>
                  )}
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-700 leading-relaxed whitespace-pre-line break-words">
                {message.message}
              </p>

              {message.product_id &&
                (message.product?.slug ? (
                  <Link
                    href={`/${message.product.slug}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                  >
                    <Package className="w-3.5 h-3.5" /> About “{message.product.title}”
                  </Link>
                ) : (
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Package className="w-3.5 h-3.5" /> About a listing that is no longer published
                  </p>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
