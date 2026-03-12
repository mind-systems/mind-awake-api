import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBreathSessionSettingsTable1773332473903 implements MigrationInterface {
  name = 'CreateBreathSessionSettingsTable1773332473903';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "breath_session_settings" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId"     uuid NOT NULL,
        "sessionId"  uuid NOT NULL,
        "starred"    boolean NOT NULL DEFAULT false,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_breath_session_settings_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_breath_session_settings_user_session" UNIQUE ("userId", "sessionId"),
        CONSTRAINT "FK_breath_session_settings_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_breath_session_settings_session" FOREIGN KEY ("sessionId") REFERENCES "breath_sessions"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_breath_session_settings_user_starred" ON "breath_session_settings" ("userId", "starred")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_breath_session_settings_user_starred"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "breath_session_settings"`);
  }
}
