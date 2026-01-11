import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FileSchema } from './schemas/file.schema';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { FileCron } from './file.cron';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
    GoogleDriveModule,
  ],
  controllers: [FileController],
  providers: [FileService, FileCron],
})
export class FileModule {}
