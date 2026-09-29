import { TestBed } from '@angular/core/testing';
import type { SessionDto } from '@nexustrade/contracts';
import { of } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  const session: SessionDto = {
    user: { id: 'user-1', email: 'user@example.com', displayName: 'User' },
    memberships: [],
  };
  const api = {
    session: vi.fn(),
    refresh: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [{ provide: AuthApiService, useValue: api }] });
  });

  it('hydrates an existing session', async () => {
    api.session.mockReturnValue(of({ session }));
    const service = TestBed.inject(AuthSessionService);
    await service.initialize();
    expect(service.user()?.email).toBe('user@example.com');
    expect(api.refresh).not.toHaveBeenCalled();
  });

  it('uses refresh when the access session is absent', async () => {
    api.session.mockReturnValue(of({ session: null }));
    api.refresh.mockReturnValue(of({ session }));
    const service = TestBed.inject(AuthSessionService);
    await service.initialize();
    expect(service.isAuthenticated()).toBe(true);
    expect(api.refresh).toHaveBeenCalledOnce();
  });
});
