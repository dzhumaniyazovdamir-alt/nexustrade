export type HealthStatus = 'ok' | 'error';

export interface HealthCheck {
  status: HealthStatus;
}

export interface HealthResponse {
  status: HealthStatus;
  service: 'nexustrade-api';
  timestamp: string;
  checks?: {
    database: HealthCheck;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: unknown;
  };
}
