import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LandingPage } from './landing-page';

@Component({ selector: 'app-stub', template: 'checkout' })
class CheckoutStub {}

const render = (): HTMLElement => {
  const fixture = TestBed.createComponent(LandingPage);
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
};

describe('LandingPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'checkout', component: CheckoutStub }])],
    });
  });

  it('presenta el problema de la prueba tecnica', () => {
    const text = render().textContent ?? '';

    expect(text).toContain('Core E-Commerce con Sistema de Descuentos Acumulativos');
    expect(text).toContain('motor de descuentos acumulativos');
    expect(text).toContain('tope absoluto infranqueable del 35%');
  });

  it('muestra el modelo relacional como imagen del repositorio', () => {
    const image = render().querySelector('img.schema__image');

    expect(image?.getAttribute('src')).toBe('modelo-relacional.png');
  });

  it('describe el diagrama para quien no puede verlo', () => {
    const alt = render().querySelector('img.schema__image')?.getAttribute('alt') ?? '';

    expect(alt).toContain('order_items');
    expect(alt).toContain('claves foráneas');
  });

  it('explica por que la referencia al cupon no lleva clave foranea', () => {
    expect(render().textContent).toContain('dato histórico');
  });

  it('enumera los criterios que evalua la kata', () => {
    const text = render().textContent ?? '';

    expect(text).toContain('Arquitectura fundamentada');
    expect(text).toContain('Patrones para el desacoplamiento');
    expect(text).toContain('Tipado robusto');
    expect(text).toContain('Modularidad');
    expect(text).toContain('Estrategia de pruebas');
    expect(text).toContain('Gobernanza de IA');
  });

  it('explica el stack de cada lado', () => {
    const text = render().textContent ?? '';

    expect(text).toContain('Backend');
    expect(text).toContain('arquitectura hexagonal');
    expect(text).toContain('SELECT … FOR UPDATE');
    expect(text).toContain('Frontend');
    expect(text).toContain('Atomic Design');
  });

  it('no duplica la entrada al MVP: esa accion vive en la cabecera', () => {
    const buttons = Array.from((render().querySelectorAll('button')));

    expect(buttons.some((button) => button.textContent?.includes('Ingresar al MVP'))).toBe(false);
  });
});
