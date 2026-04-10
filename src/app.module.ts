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

@Module({
  imports: [DatabaseModule, AppsModule, AuthModule, TransactionsModule, OrdersModule, ReportsModule, ItemsModule, UsersModule, CustomersModule, AppSettingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
