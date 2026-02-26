import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateJwtBlacklist1771601600962 implements MigrationInterface {
    name = 'CreateJwtBlacklist1771601600962'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_users_firebase_uid"`);
        await queryRunner.query(`CREATE TABLE "jwt_blacklist" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "expires_at" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4736ee7d3e0da58a3156e1d3262" UNIQUE ("token"), CONSTRAINT "PK_115e9ec74f8243b396da68a2eea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4736ee7d3e0da58a3156e1d326" ON "jwt_blacklist" ("token") `);
        await queryRunner.query(`CREATE INDEX "IDX_06b923535c4764253c786d04d6" ON "jwt_blacklist" ("expires_at") `);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'user'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" character varying NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_06b923535c4764253c786d04d6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4736ee7d3e0da58a3156e1d326"`);
        await queryRunner.query(`DROP TABLE "jwt_blacklist"`);
        await queryRunner.query(`CREATE INDEX "IDX_users_firebase_uid" ON "users" ("firebase_uid") `);
        await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email") `);
    }

}
