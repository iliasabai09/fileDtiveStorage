import { Injectable, Logger } from '@nestjs/common';
import { drive_v3, google } from 'googleapis';
import { spawn } from 'child_process';
import process from 'node:process';

@Injectable()
export class DriveService {
  private drive: drive_v3.Drive;
  private folderId?: string;
  private isDriveSyncRunning = false;
  private readonly logger = new Logger(DriveService.name);

  constructor() {
    this._initStorage();
  }

  private _initStorage(): void {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '';
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    this.drive = google.drive({ version: 'v3', auth: oAuth2Client });
  }

  /**
   * Архивирует uploads и заливает в Google Drive (streaming)
   */
  async syncUploadsToDrive(): Promise<{ ok: true; fileId: string }> {
    if (this.isDriveSyncRunning) {
      throw new Error('Drive sync already running');
    }

    this.isDriveSyncRunning = true;

    try {
      const uploadsDir = process.env.UPLOAD_DIR || 'uploads';

      const fileName = `uploads_${new Date()
        .toISOString()
        .replace(/[:.]/g, '-')}.tar.gz`;

      this.logger.log(`Starting Drive sync: ${fileName}`);

      // 🔥 tar -> stdout
      const tarProcess = spawn('tar', ['-czf', '-', uploadsDir], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      tarProcess.stderr.on('data', (data) => {
        this.logger.warn(data.toString());
      });

      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents: this.folderId ? [this.folderId] : undefined,
        },
        media: {
          mimeType: 'application/gzip',
          body: tarProcess.stdout, // 🔥 stream прямо в Drive
        },
      });

      this.logger.log(`Drive sync completed: ${response.data.id}`);

      return {
        ok: true,
        fileId: response.data.id!,
      };
    } finally {
      this.isDriveSyncRunning = false;
    }
  }

  async restoreUploadsFromDrive(fileId: string): Promise<{ ok: true }> {
    if (this.isDriveSyncRunning) {
      throw new Error('Drive operation already running');
    }

    this.isDriveSyncRunning = true;

    try {
      const uploadDir = process.env.UPLOAD_DIR || 'uploads';

      this.logger.log(`Starting restore from Drive: ${fileId}`);

      const res = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' },
      );

      const tarProcess = spawn(
        'tar',
        ['-xzf', '-', '--strip-components=2', '-C', uploadDir],
        { stdio: ['pipe', 'inherit', 'inherit'] },
      );

      res.data.pipe(tarProcess.stdin);

      await new Promise<void>((resolve, reject) => {
        tarProcess.on('close', (code) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          code === 0
            ? resolve()
            : reject(new Error(`tar exited with code ${code}`));
        });
      });

      this.logger.log(`Restore completed from Drive: ${fileId}`);

      return { ok: true };
    } finally {
      this.isDriveSyncRunning = false;
    }
  }
}
