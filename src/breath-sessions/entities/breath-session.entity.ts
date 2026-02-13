import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export interface BreathStep {
  type: 'inhale' | 'exhale' | 'hold';
  duration: number;
}

export interface BreathExercise {
  steps: BreathStep[];
  restDuration: number;
  repeatCount: number;
}

@Entity('breath_sessions')
@Index(['userId', 'createdAt'])
@Index(['shared', 'createdAt'])
export class BreathSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('text')
  description: string;

  @Column('jsonb')
  exercises: BreathExercise[];

  @Column('boolean', { default: false })
  @Index()
  shared: boolean;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}