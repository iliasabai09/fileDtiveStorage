import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { File } from './schemas/file.schema';
import { FileResponseDto } from './dto/response-file.dto';
import { REQUEST } from '@nestjs/core';
import express from 'express';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { randomUUID } from 'crypto';

@Injectable()
export class FileService {
  constructor(
    private googleDriveService: GoogleDriveService,
    @InjectModel(File.name) private fileModel: Model<File>,
    @Inject(REQUEST) private readonly request: express.Request,
  ) {}

  private isDriveSyncRunning = false;

  private buildFileUrl(path: string): string {
    return `${this.request.protocol}://${this.request.get(
      'host',
    )}/uploads/${path}`;
  }

  async upload(
    file: Express.Multer.File,
    projectName: string,
  ): Promise<FileResponseDto> {
    const savedFile = await this.fileModel.create({
      originalName: file.originalname,
      filename: file.filename,
      path: file.filename, // ⚠️ path БЕЗ /uploads
      mimeType: file.mimetype,
      size: file.size,
      projectName,
      driveSyncStatus: 'in_progress',
    });

    return {
      id: savedFile._id.toString(),
      originalName: savedFile.originalName,
      mimeType: savedFile.mimeType,
      size: savedFile.size,
      url: this.buildFileUrl(savedFile.path),
      driveSyncStatus: savedFile.driveSyncStatus,
      driveFileId: savedFile.driveFileId,
      createdAt: savedFile.createdAt,
      updatedAt: savedFile.updatedAt,
    };
  }

  async updateFile(
    fileId: string,
    newFile: Express.Multer.File,
  ): Promise<FileResponseDto> {
    const fileDoc = await this.fileModel.findById(fileId);

    if (!fileDoc) {
      throw new NotFoundException('File not found');
    }

    // 1️⃣ удаляем старый локальный файл
    const oldFilePath = path.join(process.cwd(), 'uploads', fileDoc.path);

    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }

    // 2️⃣ обновляем данные
    fileDoc.originalName = newFile.originalname;
    fileDoc.filename = newFile.filename;
    fileDoc.path = newFile.filename;
    fileDoc.mimeType = newFile.mimetype;
    fileDoc.size = newFile.size;

    // 3️⃣ помечаем как устаревший для Google Drive
    fileDoc.driveSyncStatus = 'outdated';

    const savedFile = await fileDoc.save();

    return {
      id: savedFile._id.toString(),
      originalName: savedFile.originalName,
      mimeType: savedFile.mimeType,
      size: savedFile.size,
      url: this.buildFileUrl(savedFile.path),
      driveSyncStatus: savedFile.driveSyncStatus,
      driveFileId: savedFile.driveFileId,
      createdAt: savedFile.createdAt,
      updatedAt: savedFile.updatedAt,
    };
  }

  async deleteFile(fileId: string): Promise<{ ok: true }> {
    const fileDoc = await this.fileModel.findById(fileId);

    if (!fileDoc) {
      throw new NotFoundException('File not found');
    }

    // 1) удаляем локально
    const absolutePath = path.join(process.cwd(), 'uploads', fileDoc.path);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    // 2) помечаем на удаление в Google Drive
    // если driveFileId нет — всё равно можно пометить deleted/pendingDelete
    fileDoc.driveSyncStatus = 'pendingDelete';

    await fileDoc.save();

    return { ok: true };
  }

  async saveFileFromUrl(
    url: string,
    projectName: string,
  ): Promise<FileResponseDto> {
    // 1) запрашиваем файл
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: 15000,
    });

    const contentType =
      (response.headers['content-type'] as string) ||
      'application/octet-stream';
    const contentLength = Number(response.headers['content-length'] || 0);

    // 2) определяем имя файла
    const urlPath = new URL(url).pathname;
    const originalName = path.basename(urlPath) || 'file';
    const ext = path.extname(originalName);
    const filename = `${randomUUID()}${ext}`;

    // 3) путь сохранения
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, filename);

    // 4) сохраняем файл
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    // 5) сохраняем в Mongo
    const savedFile = await this.fileModel.create({
      originalName,
      filename,
      path: filename,
      mimeType: contentType,
      size: contentLength || fs.statSync(filePath).size,
      projectName,
      driveSyncStatus: 'in_progress',
    });

    // 6) ответ
    return {
      id: savedFile._id.toString(),
      originalName: savedFile.originalName,
      mimeType: savedFile.mimeType,
      size: savedFile.size,
      url: this.buildFileUrl(savedFile.path),
      driveSyncStatus: savedFile.driveSyncStatus,
      driveFileId: savedFile.driveFileId,
      createdAt: savedFile.createdAt,
      updatedAt: savedFile.updatedAt,
    };
  }

  async syncFilesToDrive(): Promise<{
    synced: number;
    deleted: number;
    failed: number;
  }> {
    // защита от параллельного запуска
    if (this.isDriveSyncRunning) {
      return { synced: 0, deleted: 0, failed: 0 };
    }

    this.isDriveSyncRunning = true;

    let synced = 0;
    let deleted = 0;
    let failed = 0;

    try {
      // 1) Синк (upload/update)
      const toSync = await this.fileModel.find({
        driveSyncStatus: { $in: ['in_progress', 'outdated'] },
      });

      for (const file of toSync) {
        try {
          const absolutePath = path.join(process.cwd(), 'uploads', file.path);

          if (!fs.existsSync(absolutePath)) {
            // локальный файл пропал -> ошибка (или можно сразу pendingDelete поставить)
            file.driveSyncStatus = 'error';
            await file.save();
            failed++;
            continue;
          }

          const driveFileId = file.driveFileId
            ? await this.googleDriveService.updateExisting({
                driveFileId: file.driveFileId,
                localPath: absolutePath,
                mimeType: file.mimeType,
                name: file.originalName, // можно убрать, если не хочешь менять имя
              })
            : await this.googleDriveService.uploadNew({
                localPath: absolutePath,
                mimeType: file.mimeType,
                name: file.originalName,
              });

          file.driveFileId = driveFileId;
          file.driveSyncStatus = 'uploaded';
          await file.save();
          synced++;
        } catch (e: any) {
          file.driveSyncStatus = 'error';
          await file.save();
          failed++;
        }
      }

      // 2) Удаление в Drive (pendingDelete)
      const toDelete = await this.fileModel.find({
        driveSyncStatus: 'pendingDelete',
      });

      for (const file of toDelete) {
        try {
          // если driveFileId нет — в Drive нечего удалять, просто помечаем deleted
          if (file.driveFileId) {
            await this.googleDriveService.delete(file.driveFileId);
          }

          file.driveSyncStatus = 'deleted';
          await file.save();
          deleted++;
        } catch (error) {
          file.driveSyncStatus = 'error';
          await file.save();
          failed++;
        }
      }

      return { synced, deleted, failed };
    } finally {
      this.isDriveSyncRunning = false;
    }
  }

  async restoreMissingLocalFilesBatch(limit = 50): Promise<{
    limit: number;
    checked: number;
    restored: number;
    skipped: number;
    failed: number;
  }> {
    // Жёстко ограничим максимум 50
    const batchLimit = Math.max(1, Math.min(Number(limit) || 50, 50));

    // Берём только те, у кого:
    // - не deleted/pendingDelete
    // - есть driveFileId (иначе нечего восстанавливать)
    // - и потенциально могли потеряться локально
    // Сами проверим existsSync локально уже в цикле.
    const files = await this.fileModel
      .find({
        driveSyncStatus: { $nin: ['deleted', 'pendingDelete'] },
        driveFileId: { $exists: true, $ne: null },
      })
      .sort({ updatedAt: 1 })
      .limit(batchLimit);

    let checked = 0;
    let restored = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of files) {
      checked++;

      const localPath = path.join(process.cwd(), 'uploads', file.path);

      // если уже есть — пропускаем
      if (fs.existsSync(localPath)) {
        skipped++;
        continue;
      }

      try {
        await this.googleDriveService.downloadToLocal({
          driveFileId: file.driveFileId!,
          localPath,
        });

        // обновим размер по факту
        const stat = fs.statSync(localPath);
        file.size = stat.size;

        // локально восстановили — считаем ок
        file.driveSyncStatus = 'uploaded';
        await file.save();

        restored++;
      } catch (e) {
        file.driveSyncStatus = 'error';
        await file.save();
        failed++;
      }
    }

    return { limit: batchLimit, checked, restored, skipped, failed };
  }
}
