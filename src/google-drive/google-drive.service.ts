import { Injectable } from '@nestjs/common';
import { drive_v3, google } from 'googleapis';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleDriveService {
  private readonly drive: drive_v3.Drive;
  private folderId?: string;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.getOrThrow<string>(
      'GOOGLE_OAUTH_CLIENT_ID',
    );

    const clientSecret = this.configService.getOrThrow<string>(
      'GOOGLE_OAUTH_CLIENT_SECRET',
    );

    const refreshToken = this.configService.getOrThrow<string>(
      'GOOGLE_OAUTH_REFRESH_TOKEN',
    );

    // опционально
    this.folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    this.drive = google.drive({ version: 'v3', auth: oAuth2Client });
  }

  /**
   * Создать новый файл в Google Drive
   * @returns driveFileId
   */
  async uploadNew(params: {
    localPath: string;
    mimeType: string;
    name: string; // имя в Google Drive
  }): Promise<string> {
    const { localPath, mimeType, name } = params;

    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file does not exist: ${localPath}`);
    }

    const fileStream = fs.createReadStream(localPath);

    const res = await this.drive.files.create({
      requestBody: {
        name,
        parents: this.folderId ? [this.folderId] : undefined,
      },
      media: {
        mimeType,
        body: fileStream,
      },
      fields: 'id',
    });

    const id = res.data.id;
    if (!id) throw new Error('Google Drive: create did not return file id');
    return id;
  }

  /**
   * Обновить существующий файл по driveFileId
   * @returns driveFileId (обычно тот же)
   */
  async updateExisting(params: {
    driveFileId: string;
    localPath: string;
    mimeType: string;
    name?: string; // можно менять имя (опционально)
  }): Promise<string> {
    const { driveFileId, localPath, mimeType, name } = params;

    if (!driveFileId) throw new Error('driveFileId is required');
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file does not exist: ${localPath}`);
    }

    const fileStream = fs.createReadStream(localPath);

    const res = await this.drive.files.update({
      fileId: driveFileId,
      requestBody: name ? { name } : undefined,
      media: {
        mimeType,
        body: fileStream,
      },
      fields: 'id',
    });

    return res.data.id ?? driveFileId;
  }

  async downloadToLocal(params: {
    driveFileId: string;
    localPath: string;
  }): Promise<void> {
    const { driveFileId, localPath } = params;

    const dest = fs.createWriteStream(localPath);

    const res = await this.getClient().files.get(
      { fileId: driveFileId, alt: 'media' },
      { responseType: 'stream' },
    );

    await new Promise<void>((resolve, reject) => {
      (res.data as unknown as NodeJS.ReadableStream)
        .pipe(dest)
        .on('finish', () => resolve())
        .on('error', reject);
    });
  }

  /**
   * Удалить файл в Google Drive
   */
  async delete(driveFileId: string): Promise<void> {
    if (!driveFileId) return;
    await this.drive.files.delete({ fileId: driveFileId });
  }

  /**
   * (Опционально) метаданные файла — полезно для дебага
   */
  async getFileMeta(driveFileId: string): Promise<drive_v3.Schema$File> {
    const res = await this.drive.files.get({
      fileId: driveFileId,
      fields: 'id,name,mimeType,parents,modifiedTime,size,trashed',
    });
    return res.data;
  }

  /**
   * (Опционально) поменять папку назначения во время выполнения
   */
  setFolderId(folderId?: string) {
    this.folderId = folderId || undefined;
  }

  /**
   * (Опционально) доступ к raw клиенту
   */
  getClient(): drive_v3.Drive {
    return this.drive;
  }
}
