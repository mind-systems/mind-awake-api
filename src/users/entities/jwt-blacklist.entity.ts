import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('jwt_blacklist')
export class JwtBlacklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  token: string;

  @Index()
  @Column({ type: 'int' })
  expiresAt: number;

  @CreateDateColumn()
  createdAt: Date;
}
