// cotebek/src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AppsModule } from './apps/apps.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';
import { OrdersModule } from './orders/orders.module';
import { ReportsModule } from './reports/reports.module';
import { ItemsModule } from './items/items.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { envValidationSchema } from './common/config/env.validation';
import { ConfigModule } from '@nestjs/config';
import { RolesGuard } from './common/guards/roles.guard';
import { PromosModule } from './promos/promos.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLogsModule } from './common/audit-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // no need to import in every module
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // show ALL missing vars, not just first
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 30_000, // 60 seconds window
        limit: 2048, // 100 requests per window (global)
      },
      {
        name: 'strict',
        ttl: 60_000,
        limit: 5, // 5 requests per window (for sensitive endpoints)
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AppsModule,
    AuthModule,
    TransactionsModule,
    OrdersModule,
    ReportsModule,
    ItemsModule,
    UsersModule,
    CustomersModule,
    AppSettingsModule,
    PromosModule,
    AuditLogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    /* {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }, */
  ],
})
export class AppModule {}
