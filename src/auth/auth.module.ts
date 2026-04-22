// cotebek/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ApiKeyGuard } from './api-key/api-key.guard';
import { DualAuthGuard } from './dual-auth/dual-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, ApiKeyGuard, DualAuthGuard, AuthService],
  exports: [JwtModule, ApiKeyGuard, DualAuthGuard, AuthService], // Export biar bisa dipakai di tempat lain
})
export class AuthModule {}
