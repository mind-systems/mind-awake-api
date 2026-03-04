import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthCodesTable1709553600000 implements MigrationInterface {
  name = 'AddAuthCodesTable1709553600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_codes" (
        "id"        uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email"     character varying NOT NULL,
        "codeHash"  character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMP NOT NULL,
        "used"      boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_auth_codes_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_auth_codes_email"      ON "auth_codes" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_auth_codes_code_hash"  ON "auth_codes" ("codeHash")`);
    await queryRunner.query(`CREATE INDEX "IDX_auth_codes_expires_at" ON "auth_codes" ("expiresAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_codes"`);
  }
}
