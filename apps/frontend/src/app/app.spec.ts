import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('se construye', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra la marca de la tienda en la cabecera', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const header = fixture.nativeElement as HTMLElement;

    expect(header.querySelector('.app-header__brand')?.textContent).toContain('E-commerce');
  });

  it('identifica al usuario de la sesion simulada', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const header = fixture.nativeElement as HTMLElement;

    expect(header.textContent).toContain('Sergio Castro');
    expect(header.querySelector('p-avatar')?.textContent).toContain('SC');
  });

  it('deja un hueco para que el router monte la pagina', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).not.toBeNull();
  });
});
