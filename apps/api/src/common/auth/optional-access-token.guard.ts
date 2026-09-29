import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AuthenticatedUser } from './authenticated-user';
import { TokenService } from './token.service';

@Injectable()
export class OptionalAccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = request.cookies?.[this.configService.getOrThrow<string>('AUTH_ACCESS_COOKIE')] as
      string | undefined;
    if (!token) return true;
    try {
      const payload = this.tokenService.verifyAccess<{ sub: string; email: string; type: string }>(
        token,
      );
      if (payload.type === 'access') request.user = { userId: payload.sub, email: payload.email };
    } catch {
      // An expired access token is equivalent to no session for the probe.
    }
    return true;
  }
}
