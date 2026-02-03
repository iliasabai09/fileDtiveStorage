import { ApiPropertyOptional } from '@nestjs/swagger';

export type SortBy = 'createdAt' | 'size';
export type SortOrder = 'asc' | 'desc';
export type FileTypeFilter = 'image' | 'pdf' | 'video' | 'other';

export class ListFilesQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Номер страницы (>=1)' })
  page?: number;

  @ApiPropertyOptional({ example: 20, description: 'Лимит (1..100)' })
  limit?: number;

  @ApiPropertyOptional({
    example: 'crm-admin',
    description: 'Фильтр по проекту (single)',
  })
  projectName?: string;

  @ApiPropertyOptional({
    example: ['image', 'pdf'],
    isArray: true,
    // enum: ['image', 'pdf', 'video', 'other'],
    description:
      'Фильтр по типам (multi). Можно передавать как types=image&types=pdf или types=image,pdf',
  })
  types?: FileTypeFilter[] | string;

  @ApiPropertyOptional({
    example: 'report',
    description: 'Поиск по originalName (contains, регистронезависимо)',
  })
  q?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    enum: ['createdAt', 'size'],
    description: 'Сортировка по полю',
  })
  sortBy?: SortBy;

  @ApiPropertyOptional({
    example: 'desc',
    enum: ['asc', 'desc'],
    description: 'Порядок сортировки',
  })
  sortOrder?: SortOrder;
}
