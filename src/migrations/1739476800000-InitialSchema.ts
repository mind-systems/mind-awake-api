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
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email"      character varying NOT NULL,
        "name"       character varying NOT NULL,
        "language"   character varying(10) NOT NULL DEFAULT 'en',
        "role"       "public"."users_role_enum" NOT NULL DEFAULT 'user',
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id"    PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_users_email" ON "users" ("email")`,
    );

    // Table: auth_codes
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
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_codes_email"     ON "auth_codes" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_codes_code_hash" ON "auth_codes" ("codeHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_codes_expires_at" ON "auth_codes" ("expiresAt")`,
    );

    // Table: user_sessions
    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId"     uuid NOT NULL,
        "tokenHash"  character varying NOT NULL,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "lastSeenAt" TIMESTAMP DEFAULT NULL,
        CONSTRAINT "PK_user_sessions"          PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_sessions_tokenHash" UNIQUE ("tokenHash"),
        CONSTRAINT "FK_user_sessions_userId"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_sessions_tokenHash" ON "user_sessions" ("tokenHash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_sessions_userId"    ON "user_sessions" ("userId")`,
    );

    // Table: devices
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
        "model"           character varying DEFAULT NULL,
        "manufacturer"    character varying DEFAULT NULL,
        "last_seen_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "created_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_devices_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_devices_installation_id" UNIQUE ("installation_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_devices_last_seen_at" ON "devices" ("last_seen_at" DESC)`,
    );

    // Table: breath_sessions
    await queryRunner.query(`
      CREATE TABLE "breath_sessions" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId"      uuid NOT NULL,
        "description" text NOT NULL,
        "exercises"   jsonb NOT NULL,
        "complexity"  double precision NOT NULL DEFAULT 0,
        "shared"      boolean NOT NULL DEFAULT false,
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_breath_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_breath_sessions_userId"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_breath_sessions_userId"           ON "breath_sessions" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_breath_sessions_shared"           ON "breath_sessions" ("shared")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_breath_sessions_createdAt"        ON "breath_sessions" ("createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_breath_sessions_userId_createdAt" ON "breath_sessions" ("userId", "createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_breath_sessions_shared_createdAt" ON "breath_sessions" ("shared", "createdAt" DESC)`,
    );

    // Trigger: keep updatedAt in sync for breath_sessions
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
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    // Table: breath_session_settings
    await queryRunner.query(`
      CREATE TABLE "breath_session_settings" (
        "id"        uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId"    uuid NOT NULL,
        "sessionId" uuid NOT NULL,
        "starred"   boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_breath_session_settings_id"      PRIMARY KEY ("id"),
        CONSTRAINT "UQ_breath_session_settings_user_session" UNIQUE ("userId", "sessionId"),
        CONSTRAINT "FK_breath_session_settings_userId"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_breath_session_settings_sessionId"
          FOREIGN KEY ("sessionId") REFERENCES "breath_sessions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_breath_session_settings_userId_starred" ON "breath_session_settings" ("userId", "starred")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "breath_session_settings"`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_breath_sessions_updated_at ON "breath_sessions"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_updated_at_column()`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "breath_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "auth_codes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
