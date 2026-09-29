import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { type SignOptions } from 'jsonwebtoken';

@Injectable()
export class TokenService {
  constructor(private readonly configService: ConfigService) {}

  signAccess(payload: { sub: string; email: string; type: 'access' }): string {
    return jwt.sign(payload, this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'), {
      expiresIn: this.configService.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS'),
    } as SignOptions);
  }

  signRefresh(payload: { sub: string; familyId: string; type: 'refresh'; jti: string }): string {
    return jwt.sign(payload, this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'), {
      expiresIn: this.configService.getOrThrow<number>('JWT_REFRESH_TTL_SECONDS'),
    } as SignOptions);
  }

  verifyAccess<T>(token: string): T {
    return jwt.verify(token, this.configService.getOrThrow<string>('JWT_ACCESS_SECRET')) as T;
  }

  verifyRefresh<T>(token: string, ignoreExpiration = false): T {
    return jwt.verify(token, this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'), {
      ignoreExpiration,
    }) as T;
  }
}
