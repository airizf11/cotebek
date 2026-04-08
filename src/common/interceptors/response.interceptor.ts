// cotebek/src/common/interceptors/response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<StandardResponse<T>> {
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((response) => {
        // Service sudah return { message, data } — kita wrap jadi standard shape
        const { message, data, ...rest } = response ?? {};

        return {
          success: true,
          statusCode,
          message: message ?? 'OK',
          ...(data !== undefined && { data }),   // only include if exists
          ...(Object.keys(rest).length > 0 && { meta: rest }), // summary, dll masuk ke meta
        };
      }),
    );
  }
}