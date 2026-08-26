import crypto from 'crypto';
import { getDbPool } from '../config/database';
import { RecoveryLink } from '@razorrecover/shared-types';

const inMemoryLinks: Map<string, RecoveryLink> = new Map(); // tokenHash -> RecoveryLink

export class RecoveryLinkRepository {
  /**
   * Hashes a raw token string using SHA-256 for secure DB lookup.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a cryptographically secure random raw token.
   */
  public static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public async createRecoveryLink(params: {
    recoveryCaseId: string;
    merchantId: string;
    orderId: string;
    expiryHours?: number;
  }): Promise<{ link: RecoveryLink; rawToken: string }> {
    const rawToken = RecoveryLinkRepository.generateSecureToken();
    const tokenHash = RecoveryLinkRepository.hashToken(rawToken);
    const id = `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const expiryMs = (params.expiryHours || 24) * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiryMs).toISOString();
    const createdAt = new Date().toISOString();

    const link: RecoveryLink = {
      id,
      recovery_case_id: params.recoveryCaseId,
      merchant_id: params.merchantId,
      order_id: params.orderId,
      token_hash: tokenHash,
      token_raw: rawToken,
      expires_at: expiresAt,
      created_at: createdAt
    };

    const pool = getDbPool();
    if (pool) {
      try {
        const query = `
          INSERT INTO recovery_links (
            id, recovery_case_id, merchant_id, order_id, token_hash, expires_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;
        `;
        await pool.query(query, [id, link.recovery_case_id, link.merchant_id, link.order_id, tokenHash, expiresAt, createdAt]);
      } catch (err) {
        console.warn('[RecoveryLinkRepository] DB insert failed, using memory store:', (err as Error).message);
      }
    }

    inMemoryLinks.set(tokenHash, link);
    return { link, rawToken };
  }

  public async findByToken(rawToken: string): Promise<RecoveryLink | null> {
    const tokenHash = RecoveryLinkRepository.hashToken(rawToken);
    const pool = getDbPool();
    if (pool) {
      try {
        const res = await pool.query('SELECT * FROM recovery_links WHERE token_hash = $1', [tokenHash]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            id: r.id,
            recovery_case_id: r.recovery_case_id,
            merchant_id: r.merchant_id,
            order_id: r.order_id,
            token_hash: r.token_hash,
            expires_at: new Date(r.expires_at).toISOString(),
            used_at: r.used_at ? new Date(r.used_at).toISOString() : undefined,
            created_at: new Date(r.created_at).toISOString()
          };
        }
      } catch (err) {
        console.warn('[RecoveryLinkRepository] DB lookup failed, using memory store:', (err as Error).message);
      }
    }
    return inMemoryLinks.get(tokenHash) || null;
  }

  public async markUsed(id: string): Promise<void> {
    const usedAt = new Date().toISOString();
    const pool = getDbPool();
    if (pool) {
      try {
        await pool.query('UPDATE recovery_links SET used_at = $1 WHERE id = $2', [usedAt, id]);
      } catch (err) {
        console.warn('[RecoveryLinkRepository] DB markUsed failed:', (err as Error).message);
      }
    }
    for (const link of inMemoryLinks.values()) {
      if (link.id === id) {
        link.used_at = usedAt;
        break;
      }
    }
  }

  public clearInMemoryStore(): void {
    inMemoryLinks.clear();
  }
}
