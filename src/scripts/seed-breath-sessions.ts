/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

// Запуск:
// userId=ef651c74-1fd6-4804-a62b-a19f7800386c npm run seed
// # С другим env-файлом:
// userId=ef651c74-1fd6-4804-a62b-a19f7800386c envFile=.env.dev npm run seed

import 'reflect-metadata';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { BreathSession } from 'src/breath-sessions/entities/breath-session.entity';
import { DataSource } from 'typeorm';

// 1. Load env first
const envFile = process.env.envFile || '.env';
config({ path: path.resolve(process.cwd(), envFile), override: true });

// 2. Only then import DataSource (it's instantiated at module load time)
const AppDataSource: DataSource = require('src/config/typeorm.config').default;

async function main() {
  const userId = process.env.userId;
  if (!userId) {
    console.error('Error: userId env variable is required');
    process.exit(1);
  }

  const jsonPath = path.resolve(__dirname, 'breath-sessions.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const sessions = JSON.parse(raw);

  await AppDataSource.initialize();

  try {
    const repo = AppDataSource.getRepository(BreathSession);

    const records = sessions.map((s: any) => ({
      userId,
      description: s.description,
      exercises: s.exercises,
      shared: s.shared ?? false,
    }));

    await repo.insert(records);

    console.log(
      `Inserted ${records.length} breath sessions for userId=${userId}`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
