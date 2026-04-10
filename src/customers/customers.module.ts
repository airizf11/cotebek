// cotebek/src/customers/customers.module.ts
import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService], // ✅ export — dipakai orders service nanti
})
export class CustomersModule {}