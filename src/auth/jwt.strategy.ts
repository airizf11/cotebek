// cotebek/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Kasih tau satpam buat nyari token di header "Authorization: Bearer <token>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Tolak token yang udah expired
      secretOrKey: process.env.JWT_SECRET!, // Cocokkan dengan password di .env
    });
  }

  // Kalau tokennya valid dan asil, fungsi ini otomatis jalan
  async validate(payload: any) {
    // payload ini berisi data yang disimpan di dalam JWT (misal: ID User & Email)
    // Data yang di-return di sini otomatis ditempelkan ke 'request.user'
    return { 
      userId: payload.sub, 
      email: payload.email, 
      role: payload.role 
    };
  }
}