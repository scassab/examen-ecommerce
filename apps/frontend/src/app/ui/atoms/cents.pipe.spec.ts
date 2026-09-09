import { CentsPipe } from './cents.pipe';

describe('CentsPipe', () => {
  const pipe = new CentsPipe();

  it.each([
    [129_900, '$1,299.00'],
    [7990, '$79.90'],
    [0, '$0.00'],
    [1, '$0.01'],
    [100, '$1.00'],
  ])('formatea %i centavos como %s', (cents, expected) => {
    expect(pipe.transform(cents)).toBe(expected);
  });

  it('mantiene siempre dos decimales', () => {
    expect(pipe.transform(50)).toBe('$0.50');
    expect(pipe.transform(500)).toBe('$5.00');
  });
});
