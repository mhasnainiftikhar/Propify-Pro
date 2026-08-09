import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

export interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const body = this.resolveBody(exception);

    const statusCode = Number(body.statusCode);

    if (statusCode >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        JSON.stringify({
          message: body.message,
          error: body.error,
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private resolveBody(exception: unknown): ErrorResponseBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const { message, error } = exceptionResponse as Record<string, unknown>;

        return {
          statusCode: status,
          message:
            typeof message === 'string'
              ? message
              : Array.isArray(message)
                ? message
                : exception.message,
          error: typeof error === 'string' ? error : exception.message,
        };
      }

      return {
        statusCode: status,
        message: exception.message,
        error: exception.name,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
    };
  }
}
