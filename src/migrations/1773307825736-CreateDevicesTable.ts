import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDevicesTable1773307825736 implements MigrationInterface {
  name = 'CreateDevicesTable1773307825736';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "installation_id" character varying NOT NULL,
        "platform"        character varying NOT NULL,
        "os_version"      character varying NOT NULL,
        "locale"          character varying NOT NULL,
        "timezone"        character varying NOT NULL,
        "screen_width"    integer NOT NULL,
        "screen_height"   integer NOT NULL,
        "app_version"     character varying NOT NULL,
        "build_number"    character varying NOT NULL,
        "model"           character varying,
        "manufacturer"    character varying,
        "last_seen_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_devices_id"                PRIMARY KEY ("id"),
        CONSTRAINT "UQ_devices_installation_id"   UNIQUE ("installation_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_devices_installation_id" ON "devices" ("installation_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_devices_last_seen_at"    ON "devices" ("last_seen_at" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_devices_last_seen_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_devices_installation_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "devices"`);
  }
}
