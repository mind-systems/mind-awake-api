import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserStats1773479812990 implements MigrationInterface {
  name = 'AddUserStats1773479812990';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_stats" (
        "id"                   uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId"               character varying NOT NULL,
        "totalSessions"        integer NOT NULL DEFAULT 0,
        "totalDurationSeconds" integer NOT NULL DEFAULT 0,
        "currentStreak"        integer NOT NULL DEFAULT 0,
        "longestStreak"        integer NOT NULL DEFAULT 0,
        "lastSessionDate"      date,
        "updatedAt"            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_stats_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_stats_userId" UNIQUE ("userId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_stats"`);
  }
}
