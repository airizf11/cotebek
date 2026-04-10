// cotebek/src/users/users.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async getMyApps(userId: string) {
    const myApps = await this.db
      .select({
        appId: schema.apps.id,
        appName: schema.apps.name,
        apiKey: schema.apps.apiKey,
        role: schema.userApps.role,
        status: schema.userApps.status,
      })
      .from(schema.userApps)
      .innerJoin(schema.apps, eq(schema.userApps.appId, schema.apps.id))
      .where(eq(schema.userApps.userId, userId));

    return {
      message: 'App access list successfully retrieved.',
      data: myApps,
    };
  }
}