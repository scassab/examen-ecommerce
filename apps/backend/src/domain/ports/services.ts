/**
 * Reloj del sistema como puerto.
 *
 * La vigencia de un cupón y la fecha de una orden dependen del tiempo, y un
 * dominio que lee `new Date()` directamente es un dominio que no se puede
 * probar sin manipular el reloj global del proceso.
 */
export interface Clock {
  now(): Date;
}

/**
 * Generador de identificadores de orden.
 *
 * Se declara como puerto por la misma razón que el reloj: el dominio no debe
 * depender de `crypto.randomUUID` para que una prueba pueda afirmar el id de la
 * orden que se creó.
 */
export interface IdGenerator {
  next(): string;
}
