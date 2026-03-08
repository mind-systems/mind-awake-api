import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLanguageToUsers1772984825585 implements MigrationInterface {
  name = 'AddLanguageToUsers1772984825585';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "language" varchar(10) NOT NULL DEFAULT 'en'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "language"`);
  }
}
