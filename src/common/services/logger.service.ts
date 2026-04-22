// cotebek/src/common/services/logger.service.ts
import { Injectable, Logger, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger = new Logger();

  log(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'test') {
      this.logger.log(message, context);
    }
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(message, context);
    }
  }
}
