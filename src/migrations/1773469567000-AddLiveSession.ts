import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLiveSession1773469567000 implements MigrationInterface {
  name = 'AddLiveSession1773469567000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."session_status_enum" AS ENUM('active', 'disconnected', 'completed', 'abandoned')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."activity_type_enum" AS ENUM('breath_session')
    `);

    await queryRunner.query(`
      CREATE TABLE "live_sessions" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId"          character varying NOT NULL,
        "activityType"    "public"."activity_type_enum" NOT NULL,
        "activityRefType" character varying,
        "activityRefId"   character varying,
        "status"          "public"."session_status_enum" NOT NULL DEFAULT 'active',
        "startedAt"       TIMESTAMP NOT NULL,
        "disconnectedAt"  TIMESTAMP,
        "endedAt"         TIMESTAMP,
        "lastActivityAt"  TIMESTAMP NOT NULL,
        "metadata"        jsonb,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_live_sessions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_live_sessions_userId" ON "live_sessions" ("userId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_live_sessions_status" ON "live_sessions" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_live_sessions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_live_sessions_userId"`);
    await queryRunner.query(`DROP TABLE "live_sessions"`);
    await queryRunner.query(`DROP TYPE "public"."activity_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."session_status_enum"`);
  }
}
