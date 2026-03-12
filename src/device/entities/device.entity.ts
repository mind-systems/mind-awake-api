import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'installation_id' })
  @Index({ unique: true })
  installationId: string;

  @Column()
  platform: string;

  @Column({ name: 'os_version' })
  osVersion: string;

  @Column()
  locale: string;

  @Column()
  timezone: string;

  @Column({ name: 'screen_width', type: 'int' })
  screenWidth: number;

  @Column({ name: 'screen_height', type: 'int' })
  screenHeight: number;

  @Column({ name: 'app_version' })
  appVersion: string;

  @Column({ name: 'build_number' })
  buildNumber: string;

  @Column({ nullable: true })
  model: string | null;

  @Column({ nullable: true })
  manufacturer: string | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastSeenAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
