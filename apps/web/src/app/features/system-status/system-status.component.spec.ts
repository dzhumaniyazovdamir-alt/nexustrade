import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { HealthResponse } from '@nexustrade/contracts';
import { of, throwError } from 'rxjs';
import { SystemStatusApiService } from './system-status-api.service';
import { SystemStatusComponent } from './system-status.component';

describe('SystemStatusComponent', () => {
  let fixture: ComponentFixture<SystemStatusComponent>;
  let getReadiness: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getReadiness = vi.fn();

    TestBed.configureTestingModule({
      imports: [SystemStatusComponent],
      providers: [
        {
          provide: SystemStatusApiService,
          useValue: { getReadiness },
        },
      ],
    });
  });

  it('renders the ready state returned by the API', () => {
    const response: HealthResponse = {
      status: 'ok',
      service: 'nexustrade-api',
      timestamp: new Date().toISOString(),
      checks: { database: { status: 'ok' } },
    };
    getReadiness.mockReturnValue(of(response));

    fixture = TestBed.createComponent(SystemStatusComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Система готова');
  });

  it('renders an accessible error state', () => {
    getReadiness.mockReturnValue(throwError(() => new Error('offline')));

    fixture = TestBed.createComponent(SystemStatusComponent);
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Система не готова');
  });
});
