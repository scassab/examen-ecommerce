import { TestBed } from '@angular/core/testing';
import type { Category } from '@ecommerce/shared';

import { CategoryBadge } from './category-badge';

const render = (category: Category, label: string): HTMLElement => {
  const fixture = TestBed.createComponent(CategoryBadge);
  fixture.componentRef.setInput('category', category);
  fixture.componentRef.setInput('label', label);
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
};

describe('CategoryBadge', () => {
  it('muestra la etiqueta traducida que sirve el backend', () => {
    expect(render('TECHNOLOGY', 'Tecnología').textContent).toContain('Tecnología');
    expect(render('HOME', 'Hogar').textContent).toContain('Hogar');
  });

  it('no traduce por su cuenta: pinta lo que recibe', () => {
    expect(render('CLOTHING', 'Ropa').textContent).toContain('Ropa');
  });
});
