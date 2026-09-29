import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AuthenticatedUser } from './authenticated-user';
import { TokenService } from './token.service';

interface AccessTokenPayload {
  sub: string;
  email: string;
  type: 'access';
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const cookieName = this.configService.getOrThrow<string>('AUTH_ACCESS_COOKIE');
    const token = request.cookies?.[cookieName] as string | undefined;

    if (!token) {
      throw this.unauthorized();
    }

    try {
      const payload = this.tokenService.verifyAccess<AccessTokenPayload>(token);
      if (payload.type !== 'access') {
        throw new Error('Unexpected token type');
      }
      request.user = { userId: payload.sub, email: payload.email };
      return true;
    } catch {
      throw this.unauthorized();
    }
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required',
    });
  }
}
