import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity({ name: 'variant_prices' })
export class VariantPriceEntity {
  @PrimaryColumn({ type: 'uuid' })
  variantId!: string;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @Column({ type: 'numeric', precision: 19, scale: 4 })
  amount!: string;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
