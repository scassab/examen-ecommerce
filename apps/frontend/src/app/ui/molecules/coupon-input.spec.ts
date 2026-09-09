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

const render = (status: CouponStatus = 'NOT_PROVIDED'): ComponentFixture<CouponInput> => {
  const fixture = TestBed.createComponent(CouponInput);
  fixture.componentRef.setInput('status', status);
  fixture.detectChanges();

  return fixture;
};

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

  it('limpia el codigo y avisa al soltar el cupon', () => {
    const fixture = render('APPLIED');
    let cleared = false;
    fixture.componentInstance.clear.subscribe(() => (cleared = true));

    handlersOf(fixture).onCodeChange('WELCOME2026');
    handlersOf(fixture).onClear();
    fixture.detectChanges();

    expect(cleared).toBe(true);
    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    expect(input?.value).toBe('');
  });

  it('permite deshabilitar la caja mientras se recalcula la cotizacion', () => {
    const fixture = render();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement).querySelector('input');
    expect(input?.disabled).toBe(true);
  });
});
