import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { App } from './app';

@Component({ selector: 'app-stub', template: 'checkout' })
class CheckoutStub {}

const render = (): HTMLElement => {
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: 'checkout', component: CheckoutStub }])],
    }).compileComponents();
  });

  it('se construye', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('muestra la marca de la tienda en la cabecera', () => {
    expect(render().querySelector('.app-header__brand')?.textContent).toContain('E-commerce');
  });

  it('deja un hueco para que el router monte la pagina', () => {
    expect(render().querySelector('router-outlet')).not.toBeNull();
  });

  it('cierra la pagina con el pie de derechos reservados', () => {
    expect(render().textContent).toContain('Todos los derechos son reservados.');
  });

  describe('en la portada', () => {
    it('ofrece entrar al MVP en lugar de mostrar la sesion', () => {
      const element = render();

      expect(element.textContent).toContain('Iniciar sesión');
      expect(element.querySelector('p-avatar')).toBeNull();
    });

    it('el boton lleva al checkout', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
      await fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/checkout');
    });
  });

  describe('dentro de la tienda', () => {
    it('identifica al usuario de la sesion simulada', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      await TestBed.inject(Router).navigateByUrl('/checkout');
      fixture.detectChanges();

      const element = fixture.nativeElement as HTMLElement;
      expect(element.textContent).toContain('Sergio Castro');
      expect(element.querySelector('p-avatar')?.textContent).toContain('SC');
      expect(element.textContent).not.toContain('Iniciar sesión');
    });
  });
});
