import { ApiPropertyOptional } from '@nestjs/swagger';

export type FileTypeFilter = 'image' | 'pdf' | 'video' | 'other';
export type SortBy = 'createdAt' | 'size';
export type SortOrder = 'asc' | 'desc';

export class ListFilesBodyDto {
  @ApiPropertyOptional({
    description: 'Название проекта (single)',
    example: 'crm-admin',
  })
  projectName?: string;

  @ApiPropertyOptional({
    description: 'Типы файлов (multi)',
    enum: ['image', 'pdf', 'video', 'other'],
    isArray: true,
    example: ['image', 'pdf'],
  })
  types?: FileTypeFilter[];

  @ApiPropertyOptional({
    description: 'Поиск по названию файла',
    example: 'report',
  })
  q?: string;

  @ApiPropertyOptional({
    enum: ['createdAt', 'size'],
    description: 'Поле сортировки',
    example: 'createdAt',
  })
  sortBy?: SortBy;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Порядок сортировки',
    example: 'desc',
  })
  sortOrder?: SortOrder;
}
