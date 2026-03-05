import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1739476800000 implements MigrationInterface {
  name = 'InitialSchema1739476800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Enum
    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')
    `);

    // Table: users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email"       character varying NOT NULL,
        "name"        character varying NOT NULL,
        "role"        "public"."users_role_enum" NOT NULL DEFAULT 'user',
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id"          PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email"       UNIQUE ("email")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_users_email"       ON "users" ("email")`);

    // Table: jwt_blacklist
    await queryRunner.query(`
      CREATE TABLE "jwt_blacklist" (
        "id"        uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token"     character varying NOT NULL,
        "expiresAt" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_jwt_blacklist_id"    PRIMARY KEY ("id"),
        CONSTRAINT "UQ_jwt_blacklist_token" UNIQUE ("token")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_jwt_blacklist_token"     ON "jwt_blacklist" ("token")`);
    await queryRunner.query(`CREATE INDEX "IDX_jwt_blacklist_expiresAt" ON "jwt_blacklist" ("expiresAt")`);

    // Table: breath_sessions
    await queryRunner.query(`
      CREATE TABLE "breath_sessions" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId"      uuid NOT NULL,
        "description" text NOT NULL,
        "exercises"   jsonb NOT NULL,
        "shared"      boolean NOT NULL DEFAULT false,
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_breath_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_breath_sessions_userId"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_breath_sessions_userId"          ON "breath_sessions" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_breath_sessions_shared"          ON "breath_sessions" ("shared")`);
    await queryRunner.query(`CREATE INDEX "IDX_breath_sessions_createdAt"       ON "breath_sessions" ("createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_breath_sessions_userId_createdAt" ON "breath_sessions" ("userId", "createdAt" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_breath_sessions_shared_createdAt" ON "breath_sessions" ("shared", "createdAt" DESC)`);

    // Trigger: keep updatedAt in sync
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_breath_sessions_updated_at
        BEFORE UPDATE ON "breath_sessions"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_breath_sessions_updated_at ON "breath_sessions"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);
    await queryRunner.query(`DROP TABLE IF EXISTS "breath_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "jwt_blacklist"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
