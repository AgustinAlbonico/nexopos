import 'reflect-metadata';
// Log para verificar si NODE_OPTIONS está activa
// eslint-disable-next-line no-console
console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS);
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DataSource } from 'typeorm';
import { seedAdmin } from './scripts/seed-admin';
import compression from 'compression';
import { json, urlencoded } from 'express';

// Main NestJS Application Bootstrap
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Límite de tamaño de payload (10mb) para soportar imágenes de logos y comprobantes
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Habilitar compresión Gzip
  app.use(compression());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('NexoPOS API')
    .setDescription('API REST del sistema NexoPOS')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Autenticación y gestión de sesiones')
    .addTag('users', 'Gestión de usuarios')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.BACKEND_PORT ? Number(process.env.BACKEND_PORT) : 3000;
  await app.listen(port, '0.0.0.0');

  // Ejecutar seed básico (crea admin y configs si no existen)
  try {
    const dataSource = app.get(DataSource);

    // Ejecutar migraciones automáticamente si no estamos sincronizando (producción)
    // Esto es crucial para updates automáticos
    if (process.env.NODE_ENV === 'production' || process.env.RUN_MIGRATIONS === 'true') {
      try {
        console.log('Verificando migraciones pendientes...');
        await dataSource.runMigrations();
        console.log('Migraciones completadas.');
      } catch (error) {
        console.error('Error crítico al ejecutar migraciones:', error);
        // No matamos el proceso, pero esto debería investigarse si falla
      }
    }

    await seedAdmin(dataSource);
  } catch (error) {
    console.error('Error ejecutando seed automático:', error);
  }

  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://0.0.0.0:${port}`);
  console.log(`Swagger docs available at http://0.0.0.0:${port}/api/docs`);
}

bootstrap();
