import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';

import { SessionService } from './core/session/session.service';

/**
 * Marco de la aplicación: cabecera con la sesión simulada y salida del router.
 *
 * No contiene lógica de negocio; las páginas se montan dentro. La estrategia de
 * detección de cambios es `OnPush` en todo el proyecto, que es lo coherente con
 * un estado basado en señales.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AvatarModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly session = inject(SessionService);

  protected readonly user = this.session.user;
}
