import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as winston from 'winston';
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: isProd ?
          winston.format.json()
          : winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike('MindAwakeAPI', {
              colors: true,
              prettyPrint: true,
            }),
          ),
      }),
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error',
      }),
      new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Security
  app.use(helmet()); // защита HTTP заголовками

  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('Mind Awake API')
      .setDescription('The Mind Awake API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    credentials: true,
    exposedHeaders: ['Authorization'], // чтобы видеть JWT
  });

  const port = process.env.CONTAINER_API_PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}`);
  if (!isProd) {
    Logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
  }
}

void bootstrap();