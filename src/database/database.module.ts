// cotebek/src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

// Bikin provider yang bisa disuntik (injected) ke service manapun
export const DRIZZLE = Symbol('drizzle-connection');

@Global() // Kasih @Global() biar module ini otomatis bisa diakses di semua tempat
@Module({
  providers:[
    {
      provide: DRIZZLE,
      useFactory: async () => {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE], // Export supaya bisa dipakai di module lain
})
export class DatabaseModule {}