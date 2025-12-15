import { pool } from '../config/database.js';
import { UserAccount, CreateUserAccount } from '../models/UserAccount.js';

export class UserRepository {
  async create(user: CreateUserAccount & { passwordHash: string }): Promise<UserAccount> {
    const query = `
      INSERT INTO user_accounts (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING user_id, username, email, password_hash, created_at, last_login, 
                is_suspended, suspension_reason
    `;

    const result = await pool.query(query, [user.username, user.email, user.passwordHash]);
    const row = result.rows[0];

    return {
      userId: row.user_id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      lastLogin: row.last_login,
      isSuspended: row.is_suspended,
      suspensionReason: row.suspension_reason,
    };
  }

  async findByEmail(email: string): Promise<UserAccount | null> {
    const query = `
      SELECT user_id, username, email, password_hash, created_at, last_login,
             is_suspended, suspension_reason
      FROM user_accounts
      WHERE email = $1
    `;

    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      userId: row.user_id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      lastLogin: row.last_login,
      isSuspended: row.is_suspended,
      suspensionReason: row.suspension_reason,
    };
  }

  async findById(userId: string): Promise<UserAccount | null> {
    const query = `
      SELECT user_id, username, email, password_hash, created_at, last_login,
             is_suspended, suspension_reason
      FROM user_accounts
      WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      userId: row.user_id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      lastLogin: row.last_login,
      isSuspended: row.is_suspended,
      suspensionReason: row.suspension_reason,
    };
  }

  async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE user_accounts
      SET last_login = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `;

    await pool.query(query, [userId]);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const query = `
      UPDATE user_accounts
      SET password_hash = $1
      WHERE user_id = $1
    `;

    await pool.query(query, [passwordHash, userId]);
  }
}
