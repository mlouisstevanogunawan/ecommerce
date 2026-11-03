import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateSiteSettings } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

// Every field is required because the row feeds the document title, the footer
// and the contact page. A blank value would erase real contact information.
const schema = z.object({
  site_title: z.string().trim().min(2).max(120),
  site_description: z.string().trim().min(10).max(500),
  contact_email: z.string().trim().email().max(200),
  contact_phone: z.string().trim().min(6).max(40),
  address: z.string().trim().min(5).max(300),
  facebook_url: z.union([z.string().trim().regex(/^https?:\/\//i).max(2000), z.literal('')]).nullish(),
  instagram_url: z.union([z.string().trim().regex(/^https?:\/\//i).max(2000), z.literal('')]).nullish(),
  twitter_url: z.union([z.string().trim().regex(/^https?:\/\//i).max(2000), z.literal('')]).nullish(),
  youtube_url: z.union([z.string().trim().regex(/^https?:\/\//i).max(2000), z.literal('')]).nullish(),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${issue?.path.join('.') ?? 'request'}: ${issue?.message ?? 'invalid value'}` },
      { status: 400 },
    );
  }

  try {
    const settings = await updateSiteSettings({
      ...parsed.data,
      facebook_url: parsed.data.facebook_url || null,
      instagram_url: parsed.data.instagram_url || null,
      twitter_url: parsed.data.twitter_url || null,
      youtube_url: parsed.data.youtube_url || null,
    });
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[admin/settings] save failed:', error);
    return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
  }
}
