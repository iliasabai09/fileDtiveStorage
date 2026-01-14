import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  // ✅ создаём uploads в корне проекта
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // ✅ типизированный express app
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Включаем статику
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // ✅ доверяем nginx / railway proxy
  app.set('trust proxy', 1);

  const config = new DocumentBuilder()
    .setTitle('Files example')
    .setDescription('The files API description')
    .setVersion('1.0')
    .addTag('files')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // await app.listen(process.env.PORT ?? 3000);
  await app.listen(3500);
}

bootstrap();
