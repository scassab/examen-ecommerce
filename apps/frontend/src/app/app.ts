import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { filter, map } from 'rxjs';

import { SessionService } from './core/session/session.service';
import { SiteFooter } from './ui/organisms/site-footer';

/**
 * Marco de la aplicación: cabecera, salida del router y pie.
 *
 * La cabecera cambia según dónde esté el visitante. En la portada ofrece entrar
 * al MVP; dentro de la tienda muestra quién está comprando. Es la traducción
 * visible de la sesión simulada: no hay autenticación real, pero el recorrido
 * se comporta como si la hubiera.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AvatarModule, ButtonModule, SiteFooter],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly user = this.session.user;

  protected readonly isLanding = computed(() => this.currentUrl() === '/');

  /**
   * Entra al MVP.
   *
   * Se navega desde código y no con `routerLink` porque el botón de PrimeNG no
   * renderiza un ancla: la directiva quedaría sobre un `button` sin `href`, que
   * ni navega por teclado ni se puede abrir en otra pestaña.
   */
  protected enterStore(): void {
    void this.router.navigate(['/checkout']);
  }
}
