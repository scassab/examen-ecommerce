import { TestBed } from '@angular/core/testing';

import { SiteFooter } from './site-footer';

const render = (): HTMLElement => {
  const fixture = TestBed.createComponent(SiteFooter);
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
};

describe('SiteFooter', () => {
  it('muestra el aviso de derechos reservados', () => {
    expect(render().textContent).toContain(
      'Sergio Castro Saboya. Todos los derechos son reservados.',
    );
  });

  it('usa el año en curso en lugar de uno escrito a mano', () => {
    expect(render().textContent).toContain(String(new Date().getFullYear()));
  });

  it('se marca como pie de página para la accesibilidad', () => {
    expect(render().querySelector('footer')).not.toBeNull();
  });
});
