import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Файл для загрузки',
  })
  file: any;

  @ApiPropertyOptional({
    description: 'Название проекта',
    example: 'default-project',
  })
  projectName?: string;

  @ApiPropertyOptional({
    description: 'Директория внутри проекта',
    example: 'images',
  })
  projectUrl?: string;
}
