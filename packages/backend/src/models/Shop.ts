import { z } from 'zod';

export const ProductSchema = z.object({
  productId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().int().min(0),
  productType: z.enum(['EXTRA_JOKER', 'PREMIUM_FEATURE', 'COSMETIC']),
  isTransferable: z.literal(false), // Always false per requirements
  isActive: z.boolean(),
  createdAt: z.date(),
});

export const CreateProductSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  price: z.number().int().min(0),
  productType: z.enum(['EXTRA_JOKER', 'PREMIUM_FEATURE', 'COSMETIC']),
});

export const TransactionSchema = z.object({
  transactionId: z.string().uuid(),
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  amount: z.number().int().min(0),
  timestamp: z.date(),
  isRefundable: z.literal(false), // Always false per requirements
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']),
});

export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  acquiredAt: z.date(),
});

export type Product = z.infer<typeof ProductSchema>;
export type CreateProduct = z.infer<typeof CreateProductSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
