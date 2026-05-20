import { z } from 'zod';

const imageUrlSchema = z
  .string()
  .optional()
  .refine(
    (v) => {
      if (!v) return true;
      try {
        const url = new URL(v);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid http/https URL' }
  );

export const createStoreSchema = z
  .object({
    name: z.string().min(1, 'Store name is required').max(120),
    coverImageUrl: imageUrlSchema,
  })
  .strict();

export const updateStoreSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    coverImageUrl: imageUrlSchema,
    position: z.number().int().min(0).optional(),
  })
  .strict();

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
