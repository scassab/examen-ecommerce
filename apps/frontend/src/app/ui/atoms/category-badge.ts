import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Category } from '@ecommerce/shared';
import { TagModule } from 'primeng/tag';

/**
 * Etiqueta de categoría.
 *
 * Resalta Tecnología porque es la única categoría con descuento propio: el
 * cliente debe poder ver de un vistazo qué líneas de su carrito activan la
 * primera regla de la cascada.
 */
@Component({
  selector: 'app-category-badge',
  imports: [TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-tag [severity]="severity()" [value]="label()" [rounded]="true" styleClass="text-xs" />
  `,
})
export class CategoryBadge {
  public readonly category = input.required<Category>();
  /** Etiqueta traducida que llega del backend, servida desde la tabla categories. */
  public readonly label = input.required<string>();

  protected readonly severity = computed(() =>
    this.category() === 'TECHNOLOGY' ? 'info' : 'secondary',
  );
}
