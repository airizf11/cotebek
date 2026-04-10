// cotebek/src/app-settings/app-settings.module.ts
import { Module } from '@nestjs/common';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsService } from './app-settings.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AppSettingsController],
  providers: [AppSettingsService],
  exports: [AppSettingsService], // ✅ export — getValue() dipakai service lain
})
export class AppSettingsModule {}