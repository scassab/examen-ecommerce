import { provideHttpClient, withFetch } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';

/**
 * Configuración raíz de la aplicación.
 *
 * `withFetch()` usa la API nativa fetch en lugar de XMLHttpRequest, y el tema de
 * PrimeNG se registra como preset en vez de importar una hoja de estilos: así
 * los tokens de diseño quedan en TypeScript y se pueden ajustar sin tocar CSS.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    providePrimeNG({ theme: { preset: Aura } }),
  ],
};
