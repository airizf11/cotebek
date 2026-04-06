// cotebek/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { ApiKeyGuard } from './api-key/api-key.guard';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports:[
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '1d' }, // Token berlaku 1 hari
    }),
  ],
  providers: [JwtStrategy, ApiKeyGuard],
  exports: [JwtModule, ApiKeyGuard], // Export biar bisa dipakai di tempat lain
})
export class AuthModule {}