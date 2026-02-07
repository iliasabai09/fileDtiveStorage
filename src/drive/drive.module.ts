import { Module } from '@nestjs/common';
import { DriveService } from './drive.service';
import { DriveController } from './drive.controller';
import { TelegramService } from '../telegram/telegram.service';
import { DriveCron } from './drive.cron';

@Module({
  providers: [DriveService, TelegramService, DriveCron],
  controllers: [DriveController],
})
export class DriveModule {}
