import { pool } from '../config/database.js';
import { CreateDeviceFingerprint } from '../models/DeviceFingerprint.js';

export class DeviceFingerprintService {
  async storeFingerprint(fingerprint: CreateDeviceFingerprint): Promise<void> {
    const query = `
      INSERT INTO device_fingerprints (user_id, ip_address, user_agent, device_id, browser_fingerprint)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, device_id) DO NOTHING
    `;

    await pool.query(query, [
      fingerprint.userId,
      fingerprint.ipAddress,
      fingerprint.userAgent,
      fingerprint.deviceId,
      fingerprint.browserFingerprint,
    ]);
  }

  async detectCloneAccount(deviceInfo: {
    ipAddress: string;
    deviceId: string;
    browserFingerprint: string;
  }): Promise<boolean> {
    // Check for existing fingerprints with similar characteristics
    const query = `
      SELECT COUNT(DISTINCT user_id) as user_count
      FROM device_fingerprints
      WHERE 
        (ip_address = $1 AND device_id = $2) OR
        (ip_address = $1 AND browser_fingerprint = $3) OR
        (device_id = $2 AND browser_fingerprint = $3)
    `;

    const result = await pool.query(query, [
      deviceInfo.ipAddress,
      deviceInfo.deviceId,
      deviceInfo.browserFingerprint,
    ]);

    const userCount = parseInt(result.rows[0].user_count);

    // If multiple users share similar fingerprints, flag as potential clone
    return userCount >= 2;
  }

  async getFingerprintsByUser(userId: string): Promise<CreateDeviceFingerprint[]> {
    const query = `
      SELECT user_id, ip_address, user_agent, device_id, browser_fingerprint
      FROM device_fingerprints
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    return result.rows.map((row) => ({
      userId: row.user_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceId: row.device_id,
      browserFingerprint: row.browser_fingerprint,
    }));
  }
}
