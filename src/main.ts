import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enforce validation rules globally
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  
  // Open the gates for your frontend to communicate!
  app.enableCors();

  await app.listen(3000);
}
bootstrap();
