import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './../config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    allowedHeaders: ['content-type'],
    origin: config.corsOrigin,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
