import { hash, verify } from '@node-rs/argon2';
import type { PasswordHasher } from '../application/identity.ports';

export class ArgonPasswordHasher implements PasswordHasher {
  hash(password: string, memoryCost: number): Promise<string> {
    return hash(password, { memoryCost });
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
