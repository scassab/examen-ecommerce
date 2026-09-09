import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Titular de los derechos que se muestra en el pie. */
const OWNER = 'Sergio Castro Saboya';

/**
 * Pie de página del sitio.
 *
 * El año se calcula al construir el componente en lugar de escribirse a mano:
 * un aviso de copyright con el año congelado envejece solo y delata que nadie
 * volvió a mirar el código.
 */
@Component({
  selector: 'app-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="site-footer">
      <small class="site-footer__text">
        &copy; {{ year }} {{ owner }}. Todos los derechos son reservados.
      </small>
    </footer>
  `,
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly owner = OWNER;
  protected readonly year = new Date().getFullYear();
}
