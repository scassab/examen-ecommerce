import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { CouponStatus } from '@ecommerce/shared';

import { CouponInput } from './coupon-input';

interface CouponHandlers {
  onCodeChange(value: string): void;
  onApply(): void;
  onClear(): void;
}

const handlersOf = (fixture: ComponentFixture<CouponInput>): CouponHandlers =>
  fixture.componentInstance as unknown as CouponHandlers;

const render = (
  status: CouponStatus = 'NOT_PROVIDED',
  appliedCode: string | null = null,
): ComponentFixture<CouponInput> => {
  const fixture = TestBed.createComponent(CouponInput);
  fixture.componentRef.setInput('status', status);
  fixture.componentRef.setInput('appliedCode', appliedCode);
  fixture.detectChanges();

  return fixture;
};

const chipOf = (fixture: ComponentFixture<CouponInput>): HTMLElement | null =>
  (fixture.nativeElement as HTMLElement).querySelector('[data-testid="applied-coupon"]');

describe('CouponInput', () => {
  it('emite el codigo normalizado en mayusculas y sin espacios', () => {
    const fixture = render();
    let emitted: string | undefined;
    fixture.componentInstance.apply.subscribe((code) => (emitted = code));

    handlersOf(fixture).onCodeChange('  welcome2026 ');
    handlersOf(fixture).onApply();

    expect(emitted).toBe('WELCOME2026');
  });

  it('no emite nada si la caja esta vacia', () => {
    const fixture = render();
    const emitted: string[] = [];
    fixture.componentInstance.apply.subscribe((code) => emitted.push(code));

    handlersOf(fixture).onCodeChange('   ');
    handlersOf(fixture).onApply();

    expect(emitted).toHaveLength(0);
  });

  it('no muestra ningun mensaje mientras no se haya aplicado un cupon', () => {
    expect((render().nativeElement as HTMLElement).querySelector('p-message')).toBeNull();
  });

  it.each<[CouponStatus, string]>([
    ['APPLIED', 'Cupón aplicado correctamente.'],
    ['INVALID', 'El cupón no existe o ya no está activo.'],
    ['EXPIRED', 'El cupón está vencido.'],
  ])('traduce el estado %s en un mensaje para el cliente', (status, message) => {
    expect((render(status).nativeElement as HTMLElement).textContent).toContain(message);
  });

  it('limpia el campo y avisa al soltar el cupon', () => {
    const fixture = render('APPLIED', 'WELCOME2026');
    let cleared = false;
    fixture.componentInstance.clear.subscribe(() => (cleared = true));

    handlersOf(fixture).onClear();
    // El padre reacciona al aviso retirando el cupon vigente, que es lo que
    // devuelve la caja de texto a la pantalla.
    fixture.componentRef.setInput('appliedCode', null);
    fixture.componentRef.setInput('status', 'NOT_PROVIDED');
    fixture.detectChanges();

    expect(cleared).toBe(true);
    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    expect(input?.value).toBe('');
  });

  describe('cupon ya aplicado', () => {
    it('sustituye la caja de texto por la etiqueta del codigo aplicado', () => {
      const fixture = render('APPLIED', 'WELCOME2026');

      expect(chipOf(fixture)?.textContent).toContain('WELCOME2026');
      expect((fixture.nativeElement as HTMLElement).querySelector('input')).toBeNull();
    });

    it('ofrece quitar el cupon desde la propia etiqueta', () => {
      const fixture = render('APPLIED', 'WELCOME2026');
      let cleared = false;
      fixture.componentInstance.clear.subscribe(() => (cleared = true));

      // PrimeNG renderiza el aspa como un span con manejador de clic, no como un
      // boton: la prueba usa el mismo elemento que pulsaria una persona.
      const removeIcon = chipOf(fixture)?.querySelector<HTMLElement>('.p-chip-remove-icon');
      removeIcon?.click();

      expect(cleared).toBe(true);
    });

    it('devuelve la caja de texto cuando el cupon deja de estar vigente', () => {
      const fixture = render('APPLIED', 'WELCOME2026');

      fixture.componentRef.setInput('appliedCode', null);
      fixture.componentRef.setInput('status', 'NOT_PROVIDED');
      fixture.detectChanges();

      expect(chipOf(fixture)).toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelector('input')).not.toBeNull();
    });

    it('vacia el campo al aplicar, para poder escribir otro codigo', () => {
      const fixture = render();

      handlersOf(fixture).onCodeChange('welcome2026');
      handlersOf(fixture).onApply();
      fixture.detectChanges();

      const input = (fixture.nativeElement as HTMLElement).querySelector('input');
      expect(input?.value).toBe('');
    });

    it('tambien muestra la etiqueta de un cupon rechazado, para poder quitarlo', () => {
      const fixture = render('INVALID', 'NOPE2026');

      expect(chipOf(fixture)?.textContent).toContain('NOPE2026');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'El cupón no existe o ya no está activo.',
      );
    });
  });

  it('permite deshabilitar la caja mientras se recalcula la cotizacion', () => {
    const fixture = render();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    expect(input?.disabled).toBe(true);
  });
});
