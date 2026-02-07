import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileService } from './file.service';
import {
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadDto } from './dto/upload-file.dto';
import { FileResponseDto } from './dto/response-file.dto';
import { type Request } from 'express';
import { ListFilesBodyDto } from './dto/list-files.body.dto';

@Controller('file')
export class FileController {
  constructor(private readonly filesService: FileService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @ApiHeader({
    name: 'x-project-name',
    description: 'Название проекта',
    required: false,
    example: 'default-project',
  })
  @ApiHeader({
    name: 'x-project-url',
    description: 'Директория',
    required: false,
    example: 'default-project',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<FileResponseDto | any> {
    const projectName = req.header('x-project-name') || 'default';
    const projectUrl = req.header('x-project-url') || '';
    return this.filesService.upload(file, projectName, projectUrl);
  }

  @Delete(':path')
  @ApiOperation({ summary: 'Удалить файл' })
  async remove(@Param('path') path: string) {
    return this.filesService.deleteFile(path);
  }

  @Post('list')
  @ApiOperation({ summary: 'Список файлов с пагинацией и фильтрами' })
  @ApiQuery({ name: 'page', example: 1, required: true })
  @ApiQuery({ name: 'limit', example: 20, required: true })
  async list(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Body() body: ListFilesBodyDto,
  ) {
    const pageNum = Number(page);
    const limitNum = Number(limit);

    if (!pageNum || pageNum < 1) {
      throw new BadRequestException('page must be >= 1');
    }

    if (!limitNum || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }

    return this.filesService.listFiles({
      page: pageNum,
      limit: limitNum,
      ...body,
    });
  }
}
