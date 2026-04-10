// cotebek/src/auth/api-key/api-key.guard.ts
import { 
  CanActivate, 
  ExecutionContext, 
  Inject, 
  Injectable, 
  UnauthorizedException 
} from '@nestjs/common';
import { DRIZZLE } from '../../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { eq } from 'drizzle-orm'; // Untuk fungsi sama dengan (WHERE ... = ...)

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Tangkap request yang masuk
    const request = context.switchToHttp().getRequest();
    
    // 2. Ambil header bernama 'x-api-key'
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Rejected. API Key not found in headers.');
    }

    // 3. Cari di database, ada gak apiKey ini?
    const foundApps = await this.db
      .select()
      .from(schema.apps)
      .where(eq(schema.apps.apiKey, apiKey))
      .limit(1);

    const app = foundApps[0];

    // 4. Kalau gak ketemu atau statusnya non-aktif, tolak!
    if (!app || !app.isActive) {
      throw new UnauthorizedException('Rejected. Invalid API Key or app is inactive.');
    }

    // 5. INI MAGISNYA: Kalau lolos, kita tempelkan data usahanya ke objek request
    // Biar nanti di Controller kita tahu transaksi ini milik usaha yang mana
    request.appInfo = app;

    return true; // Silakan masuk!
  }
}