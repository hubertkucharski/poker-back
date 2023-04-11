import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config as localConfig } from '../config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    allowedHeaders: ['content-type'],
    origin: localConfig.corsOrigin,
    credentials: true,
  });
  await app.listen(localConfig.PORT);
}
bootstrap();
