import { MigrationInterface, QueryRunner } from "typeorm";

export class ReplaceJwtBlacklistWithSessions1773415406213 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "user_sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying NOT NULL,
                "tokenHash" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "lastSeenAt" TIMESTAMP,
                CONSTRAINT "PK_user_sessions" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_user_sessions_tokenHash" UNIQUE ("tokenHash")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_user_sessions_tokenHash" ON "user_sessions" ("tokenHash")
        `);
        await queryRunner.query(`DROP TABLE "jwt_blacklist"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_user_sessions_tokenHash"`);
        await queryRunner.query(`DROP TABLE "user_sessions"`);
        await queryRunner.query(`
            CREATE TABLE "jwt_blacklist" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "token" character varying NOT NULL,
                "expiresAt" integer NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_jwt_blacklist" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_jwt_blacklist_token" UNIQUE ("token")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_jwt_blacklist_token" ON "jwt_blacklist" ("token")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_jwt_blacklist_expiresAt" ON "jwt_blacklist" ("expiresAt")
        `);
    }

}
