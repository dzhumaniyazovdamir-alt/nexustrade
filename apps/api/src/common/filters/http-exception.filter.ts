import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorResponse } from '@nexustrade/contracts';
import type { Request, Response } from 'express';

interface ExceptionPayload {
  code?: string;
  message?: string | string[];
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { id?: string }>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = this.getPayload(exception);

    const body: ApiErrorResponse = {
      error: {
        code: payload.code ?? `HTTP_${status}`,
        message: this.getMessage(payload.message, status),
        correlationId: request.id ?? request.headers['x-correlation-id']?.toString() ?? 'unknown',
        ...(payload.details === undefined ? {} : { details: payload.details }),
      },
    };

    response.status(status).json(body);
  }

  private getPayload(exception: unknown): ExceptionPayload {
    if (!(exception instanceof HttpException)) {
      return {};
    }

    const response = exception.getResponse();
    return typeof response === 'string' ? { message: response } : (response as ExceptionPayload);
  }

  private getMessage(message: string | string[] | undefined, status: number): string {
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal server error';
    }

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return message ?? 'Request failed';
  }
}
