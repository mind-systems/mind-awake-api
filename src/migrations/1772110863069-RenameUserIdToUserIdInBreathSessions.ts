import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserIdToUserIdInBreathSessions1772110863069 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "breath_sessions" RENAME COLUMN "user_id" TO "userId"`);

    await queryRunner.query(`ALTER INDEX "idx_breath_sessions_user_id" RENAME TO "idx_breath_sessions_userId"`);
    
    await queryRunner.query(`ALTER INDEX "idx_breath_sessions_user_created" RENAME TO "idx_breath_sessions_userId_created"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER INDEX "idx_breath_sessions_userId_created" RENAME TO "idx_breath_sessions_user_created"`);
    await queryRunner.query(`ALTER INDEX "idx_breath_sessions_userId" RENAME TO "idx_breath_sessions_user_id"`);
    await queryRunner.query(`ALTER TABLE "breath_sessions" RENAME COLUMN "userId" TO "user_id"`);
  }
}
