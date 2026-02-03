import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { type Request } from 'express';
import { SaveFileByUrlDto } from './dto/save-file-by-url.dto';
import { ListFilesBodyDto } from './dto/list-files.body.dto';
import * as fs from 'node:fs';

@Controller('file')
export class FileController {
  constructor(private readonly filesService: FileService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @ApiHeader({
    name: 'X-Project-Name',
    description: 'Название проекта',
    required: false,
    example: 'default-project',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // const uploadDir = 'C:/dev/uploads';
          const uploadDir = '/var/www/uploads';

          // ✅ гарантируем, что папка существует
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);

          cb(null, uniqueName + extname(file.originalname));
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<FileResponseDto> {
    const projectName = req.header('x-project-name') || '';
    return this.filesService.upload(file, projectName);
  }

  // ---------- SYNC WITH GOOGLE DRIVE ----------
  @Get('sync')
  @ApiOperation({
    summary: 'Синхронизация файлов с Google Drive',
    description:
      'Загружает файлы со статусами in_progress и outdated, удаляет pendingDelete',
  })
  async sync() {
    return this.filesService.syncFilesToDrive();
  }

  @Post('upload-by-url')
  @ApiOperation({ summary: 'Сохранить файл по ссылке' })
  @ApiHeader({
    name: 'X-Project-Name',
    required: false,
    example: 'default-project',
  })
  @ApiBody({ type: SaveFileByUrlDto })
  async uploadByUrl(
    @Body() dto: SaveFileByUrlDto,
    @Req() req: Request,
  ): Promise<FileResponseDto> {
    const projectName = req.header('x-project-name') || '';
    return this.filesService.saveFileFromUrl(dto.url, projectName);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить файл (заменить фото)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: FileUploadDto })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads',
        filename: (req, file, cb) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueName + extname(file.originalname));
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    }),
  )
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FileResponseDto> {
    return this.filesService.updateFile(id, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить файл' })
  async remove(@Param('id') id: string) {
    return this.filesService.deleteFile(id);
  }

  @Get('restore-missing')
  @ApiOperation({
    summary:
      'Восстановить отсутствующие локальные файлы из Google Drive (пачка)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Сколько файлов взять за один запуск (1..50). По умолчанию 50',
    example: 50,
  })
  async restoreMissing(@Query('limit') limit?: string) {
    return this.filesService.restoreMissingLocalFilesBatch(Number(limit) || 50);
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
