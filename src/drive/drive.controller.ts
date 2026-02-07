import { Controller, Get, Query } from '@nestjs/common';
import { DriveService } from './drive.service';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('drive')
export class DriveController {
  constructor(private readonly driveService: DriveService) {}

  // ---------- SYNC WITH GOOGLE DRIVE ----------
  @Get('sync')
  @ApiOperation({
    summary: 'Синхронизация файлов с Google Drive',
  })
  sync() {
    return this.driveService.syncUploadsToDrive();
  }

  @Get('restore')
  @ApiOperation({ summary: 'Восстановление' })
  @ApiQuery({
    name: 'fileId',
    description: 'ID файла в Google Drive',
    required: true,
    example: '16w7eh9x_rPZt_eYaEF7Ox1MM-xVww6XY',
  })
  restore(@Query('fileId') fileId: string) {
    return this.driveService.restoreUploadsFromDrive(fileId);
  }
}
