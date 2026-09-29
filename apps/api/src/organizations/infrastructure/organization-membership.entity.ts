import type { OrganizationRole } from '@nexustrade/contracts';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'organization_memberships' })
@Unique('uq_membership_organization_user', ['organizationId', 'userId'])
@Index('idx_membership_user', ['userId'])
export class OrganizationMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: ['owner', 'admin', 'member'], enumName: 'organization_role' })
  role!: OrganizationRole;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
