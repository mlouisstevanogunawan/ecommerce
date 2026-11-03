import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteBanner, getAllBanners, saveBanner } from '@/lib/supabase/data';
import { HttpError } from '@/lib/errors';

const uuid = z.string().uuid();
const placements = ['hero', 'promo_two', 'promo_three', 'category_showcase'] as const;

// A banner is a link. It may be an internal path (/products/...) or a full
// http(s) address, but never a protocol-relative //host (that is a silent
// redirect off-site) and never a javascript:/data: payload.
const linkUrl = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (value) =>
      (value.startsWith('/') && !value.startsWith('//')) ||
      /^https?:\/\//i.test(value),
    { message: 'must be an internal path starting with / or an http(s) URL' },
  );

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .nullish();

const optionalHttp = z
  .string()
  .trim()
  .regex(/^https?:\/\//i)
  .max(2000)
  .nullish();

const saveSchema = z
  .object({
    id: uuid.optional(),
    placement: z.enum(placements),
    category_id: uuid.nullish(),
    title: z.string().trim().min(1).max(160),
    subtitle: z.string().trim().max(240).nullish(),
    button_text: z.string().trim().max(40).nullish(),
    link_url: linkUrl,
    image_url: optionalHttp,
    background_color: hexColor,
    sort_order: z.number().int().min(0).max(10000).optional(),
    is_active: z.boolean().optional(),
  })
  // Mirrors the banners_category_id_shape CHECK constraint, so a mistake is a
  // 400 with a readable message instead of a 502 from the database.
  .refine((v) => (v.placement === 'category_showcase') === Boolean(v.category_id), {
    message: 'category_id is required for a category showcase banner and must be empty for other placements',
    path: ['category_id'],
  });

function respond(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`[admin/banners] ${fallback}:`, error);
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}

function badRequest(error: z.ZodError) {
  const issue = error.issues[0];
  return NextResponse.json(
    { error: `${issue?.path.join('.') ?? 'request'}: ${issue?.message ?? 'invalid value'}` },
    { status: 400 },
  );
}

export async function GET() {
  try {
    return NextResponse.json({ banners: await getAllBanners() });
  } catch (error) {
    return respond(error, 'load banners');
  }
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const parsed = saveSchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error);

  try {
    return NextResponse.json({ success: true, banner: await saveBanner(parsed.data) });
  } catch (error) {
    return respond(error, 'save banner');
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'A valid banner id is required' }, { status: 400 });
  }

  try {
    await deleteBanner(parsedId.data);
    return NextResponse.json({ success: true, id: parsedId.data });
  } catch (error) {
    return respond(error, 'delete banner');
  }
}
