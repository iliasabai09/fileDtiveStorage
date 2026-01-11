import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FileService } from './file.service';

@Injectable()
export class FileCron {
  private readonly logger = new Logger(FileCron.name);

  constructor(private readonly fileService: FileService) {}

  // Каждый день в 03:00 по времени сервера (на Railway чаще UTC)
  @Cron('0 3 * * *', { timeZone: 'Asia/Almaty' })
  async handleDailySync() {
    this.logger.log('Daily Google Drive sync started');
    const result = await this.fileService.syncFilesToDrive();
    this.logger.log(
      `Daily Google Drive sync finished: ${JSON.stringify(result)}`,
    );
  }
}
