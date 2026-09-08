import { ConfigurationError, loadConfig, loadEnvFile } from './infrastructure/config/env';
import { createApp } from './infrastructure/http/app';

/**
 * Punto de entrada del proceso: carga el entorno, valida la configuración y
 * levanta el servidor. Es la única pieza que conoce el ciclo de vida del
 * proceso, por eso queda fuera del alcance de las pruebas unitarias.
 */
const bootstrap = (): void => {
  loadEnvFile();

  try {
    const config = loadConfig();
    const app = createApp(config);

    app.listen(config.api.port, () => {
      console.info(`[api] listening on http://localhost:${config.api.port}`);
    });
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(`[api] ${error.message}`);
      process.exit(1);
    }

    throw error;
  }
};

bootstrap();
