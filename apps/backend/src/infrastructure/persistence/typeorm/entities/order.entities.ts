import type { Category, CouponStatus, DiscountKind } from '@ecommerce/shared';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';

import { numericTransformer } from './numeric.transformer';

@Entity({ name: 'orders' })
export class OrderEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  public createdAt!: Date;

  @Column({ name: 'original_subtotal_in_cents', type: 'int' })
  public originalSubtotalInCents!: number;

  @Column({ name: 'total_discount_in_cents', type: 'int' })
  public totalDiscountInCents!: number;

  /** Recorte aplicado para respetar el tope. Cero cuando no hubo truncamiento. */
  @Column({ name: 'cap_adjustment_in_cents', type: 'int' })
  public capAdjustmentInCents!: number;

  @Column({ name: 'total_in_cents', type: 'int' })
  public totalInCents!: number;

  @Column({
    name: 'effective_discount_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
  })
  public effectiveDiscountPercentage!: number;

  @Column({
    name: 'max_discount_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
  })
  public maxDiscountPercentage!: number;

  /** Persistir esto es lo que hace auditable la alerta del tope. */
  @Column({ name: 'cap_reached', type: 'boolean' })
  public capReached!: boolean;

  @Column({ name: 'coupon_code', type: 'varchar', length: 32, nullable: true })
  public couponCode!: string | null;

  @Column({ name: 'coupon_status', type: 'varchar', length: 16 })
  public couponStatus!: CouponStatus;

  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true, eager: true })
  public items!: OrderItemEntity[];

  @OneToMany(() => OrderDiscountEntity, (discount) => discount.order, {
    cascade: true,
    eager: true,
  })
  public discounts!: OrderDiscountEntity[];
}

/**
 * Línea comprada, con los datos del producto congelados.
 *
 * `product_id` se guarda como columna suelta con clave foránea, sin relación
 * cargable: la orden no debe resolverse contra el catálogo actual, porque
 * entonces un cambio de precio reescribiría el historial.
 */
@Entity({ name: 'order_items' })
export class OrderItemEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id!: string;

  @ManyToOne(() => OrderEntity, (order) => order.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  public order!: OrderEntity;

  @Column({ name: 'product_id', type: 'uuid' })
  public productId!: string;

  @Column({ name: 'product_name', type: 'varchar', length: 120 })
  public productName!: string;

  @Column({ name: 'category_code', type: 'varchar', length: 32 })
  public categoryCode!: Category;

  @Column({ name: 'category_name', type: 'varchar', length: 64 })
  public categoryName!: string;

  @Column({ name: 'unit_price_in_cents', type: 'int' })
  public unitPriceInCents!: number;

  @Column({ name: 'quantity', type: 'int' })
  public quantity!: number;

  @Column({ name: 'line_subtotal_in_cents', type: 'int' })
  public lineSubtotalInCents!: number;
}

/**
 * Un registro por regla aplicada.
 *
 * Guardar el desglose en filas y no en tres columnas fijas permite añadir una
 * promoción nueva sin migrar la tabla de órdenes, y deja consultar en SQL cuánto
 * aportó cada regla.
 */
@Entity({ name: 'order_discounts' })
export class OrderDiscountEntity {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  public id!: string;

  @ManyToOne(() => OrderEntity, (order) => order.discounts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  public order!: OrderEntity;

  /** Posición en la cascada: preserva el orden en que se aplicaron las reglas. */
  @Column({ name: 'sequence', type: 'int' })
  public sequence!: number;

  @Column({ name: 'kind', type: 'varchar', length: 16 })
  public kind!: DiscountKind;

  @Column({
    name: 'percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    transformer: numericTransformer,
  })
  public percentage!: number;

  /** Importe sobre el que se aplicó la regla: hace auditable cada paso. */
  @Column({ name: 'base_in_cents', type: 'int' })
  public baseInCents!: number;

  @Column({ name: 'amount_in_cents', type: 'int' })
  public amountInCents!: number;
}
