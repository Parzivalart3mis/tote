import { z } from 'zod';
import { ITEM_CATEGORIES } from '@/lib/categories';

const categoryEnum = z.enum(ITEM_CATEGORIES as unknown as [string, ...string[]]).optional().nullable();

export const createPantryItemSchema = z
  .object({
    name: z.string().min(1, 'Item name is required').max(200),
    quantity: z.string().max(20).optional(),
    unit: z.string().max(20).optional(),
    note: z.string().max(500).optional(),
    category: categoryEnum,
  })
  .strict();

export const updatePantryItemSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    quantity: z.string().max(20).optional().nullable(),
    unit: z.string().max(20).optional().nullable(),
    note: z.string().max(500).optional().nullable(),
    category: categoryEnum,
    isOut: z.boolean().optional(),
    position: z.number().int().min(0).max(9999).optional(),
  })
  .strict();

export type CreatePantryItemInput = z.infer<typeof createPantryItemSchema>;
export type UpdatePantryItemInput = z.infer<typeof updatePantryItemSchema>;
