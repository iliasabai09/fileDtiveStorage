import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { File } from './schemas/file.schema';
import { FileResponseDto } from './dto/response-file.dto';
import { REQUEST } from '@nestjs/core';
import express from 'express';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { basename, dirname, extname } from 'path';
import * as fsPr from 'fs/promises';
import * as fs from 'fs';
import { buildMimeFilter } from './helpers/buildMimeFilter';
import process from 'node:process';
import { decodeFileName } from './helpers/decodeFileName';
import { transliterate } from './helpers/transliterate';
import { randomNDigits } from './helpers/randomNDigits';
import * as path from 'node:path';

@Injectable()
export class FileService {
  constructor(
    private googleDriveService: GoogleDriveService,
    @InjectModel(File.name) private fileModel: Model<File>,
    @Inject(REQUEST) private readonly request: express.Request,
  ) {}

  private isDriveSyncRunning = false;

  private buildFileUrl(path: string, withBase: boolean = true): string {
    const uploadDir = withBase ? (process.env.UPLOAD_DIR as string) : '';
    return `${uploadDir}/${path}`;
  }

  async upload(
    file: Express.Multer.File,
    projectName: string,
    projectUrl: string,
  ): Promise<FileResponseDto | any> {
    const uploadRoot = process.env.UPLOAD_DIR || '';

    const ext = extname(file.originalname);
    const originalName = decodeFileName(basename(file.originalname, ext));
    const filename = transliterate(originalName);
    const rand = randomNDigits(4);

    const path = `/${projectName}/${projectUrl}/${filename}-${rand}${ext}`;
    const fullPath = uploadRoot + path;
    // 🔥 1. создаём директорию
    await fsPr.mkdir(dirname(fullPath), { recursive: true });
    // 🔥 2. сохраняем файл
    await fsPr.writeFile(fullPath, file.buffer);

    return await this.fileModel.create({
      originalName,
      path,
      mimeType: file.mimetype,
      size: file.size,
      projectName,
    });
  }

  async deleteFile(filePath: string): Promise<{ ok: true }> {
    const fileDoc = await this.fileModel.findOne({ path: filePath });
    if (!fileDoc) throw new NotFoundException('File not found');
    const uploadRoot = process.env.UPLOAD_DIR || '';

    // абсолютный путь к файлу
    const absolutePath = path.join(uploadRoot, fileDoc.path);

    // 1️⃣ удаляем локальный файл
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    // 2️⃣ удаляем запись из БД
    await this.fileModel.deleteOne({ _id: fileDoc._id });

    return { ok: true };
  }

  async listFiles(params: {
    page: number;
    limit: number;
    projectName?: string;
    types?: ('image' | 'pdf' | 'video' | 'other')[];
    q?: string;
    sortBy?: 'createdAt' | 'size';
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, projectName, q, types, sortBy, sortOrder } = params;

    const skip = (page - 1) * limit;

    const filter: any = {
      driveSyncStatus: { $nin: ['deleted', 'pendingDelete'] },
    };

    if (projectName) {
      filter.projectName = projectName;
    }

    // ---- SEARCH (q): regex for short, $text for long ----
    const queryText = (q || '').trim();
    const useTextSearch = queryText.length >= 3;

    if (queryText) {
      if (useTextSearch) {
        filter.$text = { $search: queryText };
      } else {
        // короткий поиск — оставляем regex
        filter.originalName = { $regex: queryText, $options: 'i' };
      }
    }

    // ---- types (multi) ----
    if (types && types.length) {
      filter.$or = buildMimeFilter(types);
    }

    // ---- SORT ----
    // Если используем $text и сортировка не задана — сортируем по score + свежести
    let sort: any;

    if (useTextSearch && !sortBy) {
      sort = {
        score: { $meta: 'textScore' },
        createdAt: -1,
      };
    } else {
      sort = {
        [sortBy || 'createdAt']: (sortOrder || 'desc') === 'asc' ? 1 : -1,
      };
    }

    // ---- QUERY ----
    const findQuery = this.fileModel.find(filter);

    // если text-search — добавим score в select (полезно, можно не отдавать наружу)
    if (useTextSearch) {
      findQuery.select({ score: { $meta: 'textScore' } });
    }

    const [total, docs] = await Promise.all([
      this.fileModel.countDocuments(filter),
      findQuery.sort(sort).skip(skip).limit(limit),
    ]);

    return {
      items: docs.map((f: any) => ({
        id: f._id.toString(),
        originalName: f.originalName,
        projectName: f.projectName || 'default',
        mimeType: f.mimeType,
        size: f.size,
        url: this.buildFileUrl(f.path),
        driveSyncStatus: f.driveSyncStatus,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        score: f.score,
        // если хочешь — можно вернуть score для дебага
        // score: f.score,
      })),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };
  }
}
