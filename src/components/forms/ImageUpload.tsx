'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, TriangleAlert, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { supabaseUrl } from '@/lib/env';

// Mirrors the limits stored on storage.buckets (migration 003). They are checked again by
// Supabase on the server; this only avoids uploading a file that is certain to be rejected.
const BUCKETS = {
  products: { accept: 'image/jpeg,image/png,image/webp,image/gif', maxBytes: 10 * 1024 * 1024, label: '10 MB, jpg/png/webp/gif' },
  covers: { accept: 'image/jpeg,image/png,image/webp', maxBytes: 10 * 1024 * 1024, label: '10 MB, jpg/png/webp' },
  avatars: { accept: 'image/jpeg,image/png,image/webp', maxBytes: 5 * 1024 * 1024, label: '5 MB, jpg/png/webp' },
  blog: { accept: 'image/jpeg,image/png,image/webp', maxBytes: 10 * 1024 * 1024, label: '10 MB, jpg/png/webp' },
} as const;

export type UploadBucket = keyof typeof BUCKETS;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

interface Props {
  bucket: UploadBucket;
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

// Uploads with the visitor's own session, so the storage policies added in migration 021 decide
// whether the write is allowed. A rejected upload shows the reason instead of a success message.
export function ImageUpload({ bucket, value, onChange, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limits = BUCKETS[bucket];

  async function pick(file: File) {
    setError(null);
    if (!file.type || !limits.accept.split(',').includes(file.type)) {
      setError(`That file type is not accepted here. Use ${limits.label}.`);
      return;
    }
    if (file.size > limits.maxBytes) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${Math.round(limits.maxBytes / 1024 / 1024)} MB.`);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Sign in before uploading an image.');

      const extension = EXTENSIONS[file.type] ?? 'png';
      const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      // The object is written, so the URL is derived from the project URL rather than typed by
      // the visitor; getPublicUrl is only valid for the buckets that are actually public.
      const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(path);
      if (!publicUrl.publicUrl) throw new Error('The file was stored but no public URL came back.');
      onChange(publicUrl.publicUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function clear() {
    setError(null);
    const prefix = `${supabaseUrl()}/storage/v1/object/public/${bucket}/`;
    if (value.startsWith(prefix)) {
      setBusy(true);
      try {
        const supabase = createClient();
        const path = value.slice(prefix.length);
        await supabase.storage.from(bucket).remove([path]);
        // remove() reports no error when a storage policy filters the DELETE away, so the only
        // honest check is whether the object is still there. The link is cleared either way:
        // the database field stops pointing at the file, which is what the visitor asked for.
        const { error: gone } = await supabase.storage.from(bucket).info(path);
        if (!gone) setError('The link was cleared but the file stayed in Storage — its owner is not this account.');
      } finally {
        setBusy(false);
      }
    }
    onChange('');
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={limits.accept}
          aria-label={label ?? 'Choose an image to upload'}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pick(file);
          }}
          className="block w-full text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-teal-700 hover:file:bg-teal-100 file:cursor-pointer cursor-pointer"
        />
        {value ? (
          <button
            type="button"
            onClick={() => void clear()}
            disabled={busy}
            aria-label="Remove this image"
            className="p-1.5 rounded border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 whitespace-nowrap">
            <ImagePlus className="w-3.5 h-3.5" />
            {limits.label}
          </span>
        )}
      </div>

      {busy && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Uploading…
        </p>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded p-2" role="alert">
          <TriangleAlert className="w-3.5 h-3.5 mt-px shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {value && !busy && (
        <img
          src={value}
          alt="Uploaded preview"
          className="h-20 w-full max-w-xs object-cover rounded border border-gray-200"
        />
      )}
    </div>
  );
}
