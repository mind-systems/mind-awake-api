import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionStreamSamples1773473837884 implements MigrationInterface {
  name = 'AddSessionStreamSamples1773473837884';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "session_stream_samples" (
        "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
        "liveSessionId" character varying NOT NULL,
        "samples"       jsonb NOT NULL,
        "flushedAt"     TIMESTAMP NOT NULL,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_session_stream_samples_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_session_stream_samples_liveSessionId" ON "session_stream_samples" ("liveSessionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_session_stream_samples_liveSessionId"`,
    );
    await queryRunner.query(`DROP TABLE "session_stream_samples"`);
  }
}
