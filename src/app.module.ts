import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FileModule } from './file/file.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleDriveModule } from './google-drive/google-drive.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DriveModule } from './drive/drive.module';
import { TelegramService } from './telegram/telegram.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true, // 👈 важно
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        uri: 'mongodb+srv://iliasabaimain_db_user:wjpN78P4TkLOJZHL@cluster0.xde6qxu.mongodb.net/',
      }),
    }),
    FileModule,
    GoogleDriveModule,
    DriveModule,
  ],
  controllers: [AppController],
  providers: [AppService, TelegramService],
})
export class AppModule {}
