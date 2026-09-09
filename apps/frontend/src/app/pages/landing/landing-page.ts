import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CardModule } from 'primeng/card';

/**
 * Portada de la prueba técnica.
 *
 * Presenta el problema, el modelo de datos real y las decisiones de stack antes
 * de entrar a la aplicación. Existe por la sustentación: da un punto de partida
 * para explicar la arquitectura sin tener que dibujar nada en vivo.
 *
 * No navega a ningún sitio: la entrada al MVP es única y vive en la cabecera,
 * de modo que no haya dos botones compitiendo por la misma acción.
 */
@Component({
  selector: 'app-landing-page',
  imports: [CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {}
