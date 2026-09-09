import type { Category } from '@ecommerce/shared';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

import { numericTransformer } from './numeric.transformer';

/**
 * Entidades de persistencia.
 *
 * Son deliberadamente distintas de los modelos de dominio: aquí viven los
 * decoradores, los nombres de columna y los tipos de PostgreSQL, y nada más. El
 * dominio no las conoce, así que un cambio de esquema no puede propagarse a las
 * reglas de negocio. La traducción entre ambos mundos vive en los mappers.
 */
@Entity({ name: 'categories' })
export class CategoryEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  public id!: number;

  /** Código estable sobre el que decide el motor de descuentos. */
  @Column({ name: 'code', type: 'varchar', length: 32, unique: true })
  public code!: Category;

  /** Etiqueta que ve el usuario, editable sin tocar código. */
  @Column({ name: 'name', type: 'varchar', length: 64 })
  public name!: string;
}

@Entity({ name: 'products' })
export class ProductEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id!: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  public name!: string;

  @ManyToOne(() => CategoryEntity, { eager: true, nullable: false })
  @JoinColumn({ name: 'category_id' })
  public category!: CategoryEntity;

  /** El dinero se guarda en centavos enteros, nunca en DECIMAL. */
  @Column({ name: 'unit_price_in_cents', type: 'int' })
  public unitPriceInCents!: number;

  @Column({ name: 'stock', type: 'int' })
  public stock!: number;
}

@Entity({ name: 'coupons' })
export class CouponEntity {
  @PrimaryColumn({ name: 'code', type: 'varchar', length: 32 })
  public code!: string;

  @Column({
    name: 'percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
  })
  public percentage!: number;

  @Column({ name: 'active', type: 'boolean', default: true })
  public active!: boolean;

  /** `null` significa que el cupón no caduca. */
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  public expiresAt!: Date | null;
}
