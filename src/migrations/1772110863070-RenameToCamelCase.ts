import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameToCamelCase1772110863070 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "firebase_uid" TO "firebaseUid"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "updated_at" TO "updatedAt"`);
    
    // Rename indexes/constraints for users
    await queryRunner.query(`ALTER TABLE "users" RENAME CONSTRAINT "UQ_users_firebase_uid" TO "UQ_users_firebaseUid"`);
    await queryRunner.query(`ALTER INDEX "IDX_users_firebase_uid" RENAME TO "IDX_users_firebaseUid"`);

    // Jwt Blacklist table
    await queryRunner.query(`ALTER TABLE "jwt_blacklist" RENAME COLUMN "expires_at" TO "expiresAt"`);
    await queryRunner.query(`ALTER TABLE "jwt_blacklist" RENAME COLUMN "created_at" TO "createdAt"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Jwt Blacklist table
    await queryRunner.query(`ALTER TABLE "jwt_blacklist" RENAME COLUMN "createdAt" TO "created_at"`);
    await queryRunner.query(`ALTER TABLE "jwt_blacklist" RENAME COLUMN "expiresAt" TO "expires_at"`);

    // Users table
    await queryRunner.query(`ALTER INDEX "IDX_users_firebaseUid" RENAME TO "IDX_users_firebase_uid"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME CONSTRAINT "UQ_users_firebaseUid" TO "UQ_users_firebase_uid"`);
    
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "firebaseUid" TO "firebase_uid"`);
  }
}
