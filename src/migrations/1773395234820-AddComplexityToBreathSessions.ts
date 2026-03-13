import { MigrationInterface, QueryRunner } from "typeorm";

export class AddComplexityToBreathSessions1773395234820 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: add nullable column
        await queryRunner.query(`ALTER TABLE breath_sessions ADD COLUMN IF NOT EXISTS complexity FLOAT`);

        // Step 2: backfill existing rows from exercises JSONB
        await queryRunner.query(`
            WITH indexed AS (
                SELECT id, (ord - 1) AS idx, ex
                FROM breath_sessions,
                     jsonb_array_elements(COALESCE(exercises, '[]'::jsonb)) WITH ORDINALITY t(ex, ord)
            ),
            calc AS (
                SELECT id,
                    COALESCE(SUM(
                        CASE WHEN jsonb_array_length(ex->'steps') > 0 THEN
                            (SELECT COALESCE(SUM((s->>'duration')::float), 0)
                             FROM jsonb_array_elements(ex->'steps') s)
                            * (ex->>'repeatCount')::float
                        ELSE 0 END
                    ), 0) AS contribution,
                    COALESCE(SUM(
                        CASE
                            WHEN jsonb_array_length(ex->'steps') = 0 AND idx > 0
                                THEN (ex->>'restDuration')::float * 3
                            WHEN jsonb_array_length(ex->'steps') > 0 AND (ex->>'restDuration')::float > 0
                                THEN (ex->>'restDuration')::float * (ex->>'repeatCount')::float * 5
                            ELSE 0
                        END
                    ), 0) AS penalty
                FROM indexed GROUP BY id
            )
            UPDATE breath_sessions
            SET complexity = GREATEST(0, c.contribution - c.penalty)
            FROM calc c WHERE breath_sessions.id = c.id
        `);

        // Sessions with empty exercises array (no rows in CTE)
        await queryRunner.query(`UPDATE breath_sessions SET complexity = 0 WHERE complexity IS NULL`);

        // Step 3: enforce NOT NULL
        await queryRunner.query(`ALTER TABLE breath_sessions ALTER COLUMN complexity SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE breath_sessions ALTER COLUMN complexity SET DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE breath_sessions DROP COLUMN IF EXISTS complexity`);
    }

}
