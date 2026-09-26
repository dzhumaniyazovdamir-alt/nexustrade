import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { HealthResponse } from '@nexustrade/contracts';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SystemStatusApiService {
  private readonly http = inject(HttpClient);

  getReadiness(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>('/api/v1/health/ready');
  }
}
