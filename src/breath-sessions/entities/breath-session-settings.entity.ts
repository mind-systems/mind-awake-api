import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import { BreathSession } from './breath-session.entity';

@Entity('breath_session_settings')
@Unique(['userId', 'sessionId'])
@Index(['userId', 'starred'])
export class BreathSessionSettings {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Column('uuid', { name: 'userId' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Column('uuid', { name: 'sessionId' })
  sessionId: string;

  @ManyToOne(() => BreathSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: BreathSession;

  @ApiProperty({ example: false })
  @Column('boolean', { default: false })
  starred: boolean;

  @ApiProperty({ example: '2026-03-12T12:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2026-03-12T12:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;
}
