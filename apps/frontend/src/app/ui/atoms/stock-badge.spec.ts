import { TestBed } from '@angular/core/testing';

import { StockBadge } from './stock-badge';

const render = (stock: number): HTMLElement => {
  const fixture = TestBed.createComponent(StockBadge);
  fixture.componentRef.setInput('stock', stock);
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
};

describe('StockBadge', () => {
  it('avisa cuando el producto se agoto', () => {
    expect(render(0).textContent).toContain('Agotado');
  });

  it('marca como escasas las ultimas unidades', () => {
    expect(render(3).textContent).toContain('Últimas 3 unidades');
    expect(render(1).textContent).toContain('Últimas 1 unidades');
  });

  it('muestra la disponibilidad cuando hay existencias holgadas', () => {
    expect(render(12).textContent).toContain('12 disponibles');
  });

  it('cambia de aviso justo al cruzar el umbral', () => {
    expect(render(4).textContent).toContain('4 disponibles');
    expect(render(3).textContent).toContain('Últimas');
  });
});
