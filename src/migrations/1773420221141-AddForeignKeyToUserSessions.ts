import { MigrationInterface, QueryRunner } from "typeorm";

export class AddForeignKeyToUserSessions1773420221141 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE INDEX "IDX_user_sessions_userId" ON "user_sessions" ("userId")
        `);
        await queryRunner.query(`
            ALTER TABLE "user_sessions"
            ADD CONSTRAINT "FK_user_sessions_userId"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_user_sessions_userId"
        `);
        await queryRunner.query(`
            DROP INDEX "IDX_user_sessions_userId"
        `);
    }

}
