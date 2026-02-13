import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBreathSessions1739558400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE breath_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        description TEXT NOT NULL,
        exercises JSONB NOT NULL,
        shared BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_breath_sessions_user_id ON breath_sessions(user_id);
      CREATE INDEX idx_breath_sessions_shared ON breath_sessions(shared);
      CREATE INDEX idx_breath_sessions_created_at ON breath_sessions(created_at DESC);
      CREATE INDEX idx_breath_sessions_user_created ON breath_sessions(user_id, created_at DESC);
      CREATE INDEX idx_breath_sessions_shared_created ON breath_sessions(shared, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_breath_sessions_updated_at 
        BEFORE UPDATE ON breath_sessions 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_breath_sessions_updated_at ON breath_sessions;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column();`);
    await queryRunner.query(`DROP TABLE IF EXISTS breath_sessions;`);
  }
}