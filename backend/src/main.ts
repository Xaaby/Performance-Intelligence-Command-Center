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
  app.enableCors({ origin: 'http://localhost:5173' });
  app.setGlobalPrefix('api');
  const port = Number(process.env.BACKEND_PORT) || 3001;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
