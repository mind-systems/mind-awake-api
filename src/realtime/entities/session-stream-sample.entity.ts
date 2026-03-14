import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('session_stream_samples')
@Index(['liveSessionId'])
export class SessionStreamSample {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  liveSessionId: string;

  @Column({ type: 'jsonb' })
  samples: Record<string, unknown>[];

  @Column()
  flushedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
