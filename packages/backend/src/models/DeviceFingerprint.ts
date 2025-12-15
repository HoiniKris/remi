import { z } from 'zod';

export const DeviceFingerprintSchema = z.object({
  fingerprintId: z.string().uuid(),
  userId: z.string().uuid(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  deviceId: z.string(),
  browserFingerprint: z.string(),
  createdAt: z.date(),
});

export const CreateDeviceFingerprintSchema = z.object({
  userId: z.string().uuid(),
  ipAddress: z.string().ip(),
  userAgent: z.string(),
  deviceId: z.string(),
  browserFingerprint: z.string(),
});

export type DeviceFingerprint = z.infer<typeof DeviceFingerprintSchema>;
export type CreateDeviceFingerprint = z.infer<typeof CreateDeviceFingerprintSchema>;
