// cotebek/src/promos/promos.module.ts
import { Module } from '@nestjs/common';
import { PromosService } from './promos.service';
import { PromosController } from './promos.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PromosController],
  providers: [PromosService],
  exports: [PromosService], // ← export PromosService supaya bisa dipakai OrdersModule
})
export class PromosModule {}
