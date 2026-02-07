import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DriveService } from './drive.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class DriveCron {
  private readonly logger = new Logger(DriveCron.name);

  constructor(
    private driveService: DriveService,
    private telegramService: TelegramService,
  ) {}

  // Каждый день в 03:00 по времени сервера (на Railway чаще UTC)
  @Cron('0 3 * * *', { timeZone: 'Asia/Almaty' })
  // @Cron('*/5 * * * *', { timeZone: 'Asia/Almaty' })
  async handleDailySync() {
    this.logger.log('Daily Google Drive sync started');

    try {
      const result = await this.driveService.syncUploadsToDrive();
      await this.telegramService.sendMessage(
        `✅ <b>Backup completed</b>\n\n📦 File ID: <code>${result.fileId}</code>`,
      );
      this.logger.log(
        `Daily Google Drive sync finished: ${JSON.stringify(result)}`,
      );
    } catch (err: any) {
      await this.telegramService.sendMessage(
        `❌ <b>Backup failed</b>\n\n<pre>${err.message}</pre>`,
      );
      this.logger.error('Daily Google Drive sync failed', err);
    }
  }
}
