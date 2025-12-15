import { describe, it, expect } from '@jest/globals';
import { ProductSchema, TransactionSchema } from '../Shop';

describe('Shop Models', () => {
  describe('Product Schema', () => {
    it('should validate a valid product', () => {
      const validProduct = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Extra Joker Pack',
        description: 'Add 2 extra Jokers to your games',
        price: 500,
        productType: 'EXTRA_JOKER' as const,
        isTransferable: false,
        isActive: true,
        createdAt: new Date(),
      };

      const result = ProductSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });

    it('should enforce isTransferable to be false', () => {
      const invalidProduct = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Extra Joker Pack',
        description: 'Add 2 extra Jokers to your games',
        price: 500,
        productType: 'EXTRA_JOKER',
        isTransferable: true, // Should always be false
        isActive: true,
        createdAt: new Date(),
      };

      const result = ProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
    });

    it('should reject negative price', () => {
      const invalidProduct = {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Extra Joker Pack',
        description: 'Add 2 extra Jokers to your games',
        price: -100,
        productType: 'EXTRA_JOKER',
        isTransferable: false,
        isActive: true,
        createdAt: new Date(),
      };

      const result = ProductSchema.safeParse(invalidProduct);
      expect(result.success).toBe(false);
    });
  });

  describe('Transaction Schema', () => {
    it('should validate a valid transaction', () => {
      const validTransaction = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        productId: '123e4567-e89b-12d3-a456-426614174002',
        amount: 500,
        timestamp: new Date(),
        isRefundable: false,
        status: 'COMPLETED' as const,
      };

      const result = TransactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('should enforce isRefundable to be false', () => {
      const invalidTransaction = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        productId: '123e4567-e89b-12d3-a456-426614174002',
        amount: 500,
        timestamp: new Date(),
        isRefundable: true, // Should always be false
        status: 'COMPLETED',
      };

      const result = TransactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const invalidTransaction = {
        transactionId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        productId: '123e4567-e89b-12d3-a456-426614174002',
        amount: -500,
        timestamp: new Date(),
        isRefundable: false,
        status: 'COMPLETED',
      };

      const result = TransactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });
});
