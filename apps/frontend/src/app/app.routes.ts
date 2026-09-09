import type { Routes } from '@angular/router';

/**
 * Rutas de la aplicación.
 *
 * La portada es la ruta raíz y el MVP vive en `/checkout`. Ambas se cargan de
 * forma diferida: quien entra a la presentación no descarga el checkout, y
 * viceversa.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing-page').then((module) => module.LandingPage),
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./pages/checkout/checkout-page').then((module) => module.CheckoutPage),
  },
  { path: '**', redirectTo: '' },
];
