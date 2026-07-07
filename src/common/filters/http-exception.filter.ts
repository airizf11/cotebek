// cotebek/src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Handle rate limit separately for a clean message
    if (exception instanceof ThrottlerException) {
      return response.status(429).json({
        success: false,
        statusCode: 429,
        message: 'Too many requests. Please slow down and try again later.',
      });
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Cuma error TAK TERDUGA (500) yang di-log — error normal (400/401/404 dst.
    // dari validasi/business logic) sengaja gak berisikin log, itu emang wajar terjadi.
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception.message : 'Unknown exception',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as any).message ?? 'Something went wrong');

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message, // ValidationPipe errors are arrays
      errors: Array.isArray(message) ? message : undefined, // full list tetap tersedia
    });
  }
}
