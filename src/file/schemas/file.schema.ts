import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FileDocument = HydratedDocument<File>;

@Schema({ timestamps: true })
export class File {
  // как файл назывался у пользователя
  @Prop({ required: true })
  originalName: string;

  // как ты сохранил на диске (уникальное имя)
  @Prop({ required: true })
  filename: string;

  // название проекта
  @Prop({ required: true })
  projectName: string;

  // относительный путь
  @Prop({ required: true })
  path: string;

  // чтобы понимать тип
  @Prop({ required: true })
  mimeType: string;

  // размер (у тебя fileSize)
  @Prop({ required: true })
  size: number;

  // Идентификатор гугл диска файла
  @Prop()
  driveFileId?: string;

  // Статус гугл диска
  @Prop({ required: true })
  driveSyncStatus:
    | 'in_progress'
    | 'uploaded'
    | 'error'
    | 'outdated'
    | 'pendingDelete'
    | 'deleted';

  // Идентификатор гугл диска файла
  @Prop()
  createdAt: Date;

  // Идентификатор гугл диска файла
  @Prop()
  updatedAt: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);
