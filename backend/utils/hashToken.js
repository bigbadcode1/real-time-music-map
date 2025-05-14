import { createHash } from 'crypto';

export function hashToken(token) {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}