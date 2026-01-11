import { ApiProperty } from '@nestjs/swagger';

export class SaveFileByUrlDto {
  @ApiProperty({
    example: 'https://example.com/image.png',
    description: 'Ссылка на файл',
  })
  url: string;
}
