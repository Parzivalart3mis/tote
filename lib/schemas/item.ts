import { z } from 'zod';

export const createItemSchema = z
  .object({
    name: z.string().min(1, 'Item name is required').max(200),
    quantity: z.string().max(20).optional(),
    unit: z.string().max(20).optional(),
    note: z.string().max(500).optional(),
  })
  .strict();

export const updateItemSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    quantity: z.string().max(20).optional().nullable(),
    unit: z.string().max(20).optional().nullable(),
    note: z.string().max(500).optional().nullable(),
    checked: z.boolean().optional(),
    favorite: z.boolean().optional(),
    runningLow: z.boolean().optional(),
    position: z.number().int().min(0).max(9999).optional(),
  })
  .strict();

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
