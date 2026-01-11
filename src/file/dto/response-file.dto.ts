import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty({
    example: '66b8f8c1f2d4c9a123456789',
    description: 'ID файла',
  })
  id: string;

  @ApiProperty({
    example: 'report.pdf',
    description: 'Оригинальное имя файла',
  })
  originalName: string;

  @ApiProperty({
    example: 'application/pdf',
    description: 'MIME-тип файла',
  })
  mimeType: string;

  @ApiProperty({
    example: 1048576,
    description: 'Размер файла в байтах',
  })
  size: number;

  @ApiProperty({
    example: 'https://domen.com/uploads/2026/01/abc123.pdf',
    description: 'Публичный URL файла',
  })
  url: string;

  @ApiProperty({
    example: 'my-project',
    description: 'Название проекта, к которому относится файл',
    required: false,
  })
  projectName?: string;

  @ApiProperty({
    example: 'in_progress',
    enum: [
      'in_progress',
      'uploaded',
      'error',
      'outdated',
      'pendingDelete',
      'deleted',
    ],
    description: 'Статус синхронизации с Google Drive',
  })
  driveSyncStatus:
    | 'in_progress'
    | 'uploaded'
    | 'error'
    | 'outdated'
    | 'pendingDelete'
    | 'deleted';

  @ApiProperty({
    example: '1A2B3C4D5E',
    required: false,
    description: 'ID файла в Google Drive (если синхронизирован)',
  })
  driveFileId?: string;

  @ApiProperty({
    example: '2026-01-10T12:34:56.000Z',
    description: 'Дата создания',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-01-10T12:40:00.000Z',
    description: 'Дата обновления',
  })
  updatedAt: Date;
}
