import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { DiscountCapAlert } from './discount-cap-alert';

const render = (visible: boolean, maxDiscountPercentage = 35): ComponentFixture<DiscountCapAlert> => {
  const fixture = TestBed.createComponent(DiscountCapAlert);
  fixture.componentRef.setInput('visible', visible);
  fixture.componentRef.setInput('maxDiscountPercentage', maxDiscountPercentage);
  fixture.detectChanges();

  return fixture;
};

const alertOf = (fixture: ComponentFixture<DiscountCapAlert>): HTMLElement | null =>
  (fixture.nativeElement as HTMLElement).querySelector('[data-testid="discount-cap-alert"]');

describe('DiscountCapAlert', () => {
  it('no existe en el DOM mientras el tope no se alcanza', () => {
    expect(alertOf(render(false))).toBeNull();
  });

  it('muestra el mensaje exacto que pide la historia de usuario', () => {
    expect(alertOf(render(true))?.textContent).toContain(
      '¡Enhorabuena! Has alcanzado el límite máximo de ahorro permitido (35%)',
    );
  });

  it('toma el porcentaje del servidor en lugar de tenerlo escrito a fuego', () => {
    expect(alertOf(render(true, 40))?.textContent).toContain(
      'límite máximo de ahorro permitido (40%)',
    );
  });

  it('explica por que el ahorro dejo de crecer', () => {
    expect(alertOf(render(true))?.textContent).toContain('tu ahorro se ha truncado en el máximo');
  });

  it('se anuncia a los lectores de pantalla sin robar el foco', () => {
    const alert = alertOf(render(true));

    expect(alert?.getAttribute('role')).toBe('status');
    expect(alert?.getAttribute('aria-live')).toBe('polite');
  });

  it('no ofrece ningun boton para cerrarla: es persistente', () => {
    expect(alertOf(render(true))?.querySelector('button')).toBeNull();
  });

  it('desaparece en cuanto el servidor deja de reportar el tope', () => {
    const fixture = render(true);
    expect(alertOf(fixture)).not.toBeNull();

    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();

    expect(alertOf(fixture)).toBeNull();
  });
});
