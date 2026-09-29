import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthResponse, SessionResponse } from '@nexustrade/contracts';
import type { CookieOptions, Request, Response } from 'express';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { OptionalAccessTokenGuard } from '../../common/auth/optional-access-token.guard';
import { IdentityService } from '../application/identity.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.identityService.register(body);
    this.setCookies(response, result.tokens);
    return { session: result.session };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.identityService.login(body.email, body.password);
    this.setCookies(response, result.tokens);
    return { session: result.session };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const refreshToken = request.cookies?.[
      this.configService.getOrThrow<string>('AUTH_REFRESH_COOKIE')
    ] as string | undefined;
    const result = await this.identityService.refresh(refreshToken ?? '');
    this.setCookies(response, result.tokens);
    return { session: result.session };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshCookie = this.configService.getOrThrow<string>('AUTH_REFRESH_COOKIE');
    await this.identityService.logout(request.cookies?.[refreshCookie] as string | undefined);
    response.clearCookie(
      this.configService.getOrThrow<string>('AUTH_ACCESS_COOKIE'),
      this.cookieOptions('/'),
    );
    response.clearCookie(refreshCookie, this.cookieOptions('/api/v1/auth'));
  }

  @Get('session')
  @UseGuards(OptionalAccessTokenGuard)
  async session(@Req() request: Request & { user?: AuthenticatedUser }): Promise<SessionResponse> {
    return {
      session: request.user ? await this.identityService.getSession(request.user.userId) : null,
    };
  }

  private setCookies(
    response: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    response.cookie(
      this.configService.getOrThrow<string>('AUTH_ACCESS_COOKIE'),
      tokens.accessToken,
      this.cookieOptions('/'),
    );
    response.cookie(
      this.configService.getOrThrow<string>('AUTH_REFRESH_COOKIE'),
      tokens.refreshToken,
      this.cookieOptions('/api/v1/auth'),
    );
  }

  private cookieOptions(path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path,
    };
  }
}
