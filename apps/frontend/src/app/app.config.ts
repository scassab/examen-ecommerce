import { provideHttpClient } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';

import { environment } from '../environments/environment';

import { routes } from './app.routes';

/**
 * Tema de la aplicación: Aura con la paleta azul de PrimeNG como color primario.
 *
 * Se define como preset en TypeScript en lugar de sobrescribir CSS: los tokens
 * viajan a todos los componentes a la vez, así que botones, etiquetas y focos
 * comparten el mismo azul sin repetir un solo color a mano.
 */
const BlueAura = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Angular 22 usa fetch por defecto: withFetch() quedo deprecado.
    provideHttpClient(),
    providePrimeNG({
      // Community License de PrimeUI: sin ella la libreria inyecta un aviso
      // fijo en pantalla. La verificacion es offline.
      license: environment.primeNgLicense,
      theme: {
        preset: BlueAura,
        options: {
          // El modo oscuro se activa solo con una clase explícita. Sin esto,
          // PrimeNG sigue el esquema del sistema operativo y la tienda aparece
          // en negro en unos equipos y en claro en otros: en una demostración
          // ese detalle no puede quedar al azar.
          darkModeSelector: '.app-dark',
        },
      },
    }),
  ],
};
