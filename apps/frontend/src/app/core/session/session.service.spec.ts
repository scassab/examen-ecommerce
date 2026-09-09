import { TestBed } from '@angular/core/testing';

import { SessionService } from './session.service';

describe('SessionService', () => {
  it('expone un usuario simulado con nombre e iniciales', () => {
    const service = TestBed.inject(SessionService);

    expect(service.user()).toEqual({ name: 'Cliente Demo', initials: 'CD' });
  });

  it('expone la sesion como solo lectura', () => {
    const service = TestBed.inject(SessionService);

    expect('set' in service.user).toBe(false);
  });
});
