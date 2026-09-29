import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type RouterStateSnapshot } from '@angular/router';
import { AuthSessionService } from './auth-session.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const auth = {
    initialize: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthSessionService, useValue: auth }],
    });
  });

  it('redirects guests to login with returnUrl', async () => {
    auth.isAuthenticated.mockReturnValue(false);
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/organizations' } as RouterStateSnapshot),
    );
    expect(TestBed.inject(Router).serializeUrl(result as never)).toBe(
      '/login?returnUrl=%2Forganizations',
    );
  });

  it('allows authenticated users', async () => {
    auth.isAuthenticated.mockReturnValue(true);
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/' } as RouterStateSnapshot),
    );
    expect(result).toBe(true);
  });
});
