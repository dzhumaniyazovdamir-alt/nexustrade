import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { credentialsInterceptor } from './credentials.interceptor';
import { HttpClient } from '@angular/common/http';

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('adds credentials to requests', () => {
    http.get('/api/v1/organizations').subscribe();

    const request = controller.expectOne('/api/v1/organizations');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ organizations: [] });
  });

  it('deduplicates refresh and retries concurrent unauthorized requests once', () => {
    const results: unknown[] = [];
    http.get('/api/v1/organizations').subscribe((result) => results.push(result));
    http.get('/api/v1/profile').subscribe((result) => results.push(result));

    controller
      .expectOne('/api/v1/organizations')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne('/api/v1/profile').flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = controller.expectOne('/api/v1/auth/refresh');
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush({
      session: {
        user: { id: 'user-1', email: 'user@example.com', displayName: 'User' },
        memberships: [],
      },
    });

    controller.expectOne('/api/v1/organizations').flush({ organizations: [] });
    controller.expectOne('/api/v1/profile').flush({ id: 'user-1' });
    expect(results).toHaveLength(2);
  });

  it('does not retry authentication endpoints', () => {
    http.post('/api/v1/auth/login', {}).subscribe({ error: () => undefined });

    controller
      .expectOne('/api/v1/auth/login')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectNone('/api/v1/auth/refresh');
  });
});
