import type { OrganizationRole } from '@nexustrade/contracts';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'organization_invitations' })
@Index('idx_invitation_organization', ['organizationId'])
export class OrganizationInvitationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'enum', enum: ['admin', 'member'], enumName: 'invitation_role' })
  role!: Exclude<OrganizationRole, 'owner'>;

  @Column({ type: 'varchar', length: 64, unique: true })
  tokenHash!: string;

  @Column({ type: 'uuid' })
  invitedByUserId!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
