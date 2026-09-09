import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    // Carga diferida: la página del checkout es la única ruta hoy, pero cargarla
    // así deja el camino abierto para añadir más sin engordar el bundle inicial.
    loadComponent: () =>
      import('./pages/checkout/checkout-page').then((module) => module.CheckoutPage),
  },
  { path: '**', redirectTo: '' },
];
