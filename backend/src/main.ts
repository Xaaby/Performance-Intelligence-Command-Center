import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

(function loadEnvFiles() {
  const cwd = process.cwd();
  const paths =
    path.basename(cwd) === 'backend'
      ? [path.join(cwd, '..', '.env'), path.join(cwd, '.env')]
      : [path.join(cwd, '.env'), path.join(cwd, 'backend', '.env')];
  for (const p of paths) {
    if (fs.existsSync(p)) dotenv.config({ path: p, override: true });
  }
})();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
  const corsRaw = process.env.CORS_ORIGIN?.trim();
  // Railway / quick demo: CORS_ORIGIN=* (do not combine wildcard with credentials: true — browsers reject it)
  if (corsRaw === '*') {
    app.enableCors({ origin: '*', methods });
  } else {
    const corsOrigin = corsRaw
      ? corsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : 'http://localhost:5173';
    app.enableCors({ origin: corsOrigin, methods });
  }

  app.setGlobalPrefix('api');
  const port =
    Number(process.env.PORT) || Number(process.env.BACKEND_PORT) || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Nest listening on 0.0.0.0:${port} (PORT from env)`);
}
bootstrap();
