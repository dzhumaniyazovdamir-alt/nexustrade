import type { SessionDto } from '@nexustrade/contracts';

export const IDENTITY_REPOSITORY = Symbol('IDENTITY_REPOSITORY');
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface IdentityUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type RefreshRotationResult =
  | { status: 'invalid' }
  | { status: 'reused' }
  | { status: 'rotated'; user: IdentityUser; tokens: TokenPair };

export interface IdentityRepository {
  createRegistration(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    organizationName: string;
  }): Promise<{ status: 'created'; user: IdentityUser } | { status: 'email-exists' }>;
  findUserByEmail(email: string): Promise<IdentityUser | null>;
  getSession(userId: string): Promise<SessionDto>;
  createRefreshFamily(
    userId: string,
    expiresAt: Date,
    createTokens: (familyId: string) => TokenPair,
  ): Promise<TokenPair>;
  rotateRefreshFamily(input: {
    familyId: string;
    userId: string;
    presentedTokenHash: string;
    expiresAt: Date;
    createTokens: (user: IdentityUser) => TokenPair;
  }): Promise<RefreshRotationResult>;
  revokeRefreshFamily(familyId: string, userId: string): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string, memoryCost: number): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
}
