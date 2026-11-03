import { z } from 'zod';

// Shared by the API routes so a request body and the client form agree on one rule set.
// Route files may only export HTTP methods, so validation lives here.

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  avatar_url: z.string().trim().url('Avatar must be a full URL').max(2000).optional().nullable().or(z.literal('')),
});

export const addressSchema = z.object({
  title: z.string().trim().min(1, 'Give the address a label').max(60),
  first_name: z.string().trim().min(1, 'First name is required').max(80),
  last_name: z.string().trim().min(1, 'Last name is required').max(80),
  phone: z.string().trim().min(3, 'Phone is required').max(40),
  address_line1: z.string().trim().min(5, 'Street address is required').max(200),
  address_line2: z.string().trim().max(200).optional().nullable().or(z.literal('')),
  country: z.string().trim().min(2, 'Country is required').max(80),
  state: z.string().trim().min(1, 'State or region is required').max(80),
  city: z.string().trim().min(1, 'City is required').max(80),
  postal_code: z.string().trim().min(2, 'Postal code is required').max(20),
});

export const blogPostSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  slug: z
    .string()
    .trim()
    .min(3, 'Slug must be at least 3 characters')
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by single dashes'),
  content: z.string().min(20, 'Write at least 20 characters of content').max(60000),
  excerpt: z.string().trim().max(400).optional().nullable().or(z.literal('')),
  image_url: z.string().trim().url('Cover must be a full URL').max(2000).optional().nullable().or(z.literal('')),
  published: z.boolean(),
  category_id: z.string().uuid('Choose a category'),
});

export const blogCategorySchema = z.object({
  name: z.string().trim().min(2, 'Category name is too short').max(80),
});

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input';
}
