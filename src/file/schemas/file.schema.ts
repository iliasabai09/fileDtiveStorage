import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FileDocument = HydratedDocument<File>;

export type DriveSyncStatus =
  | 'in_progress'
  | 'uploaded'
  | 'error'
  | 'outdated'
  | 'pendingDelete'
  | 'deleted';

@Schema({ timestamps: true })
export class File {
  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true, index: true })
  projectName: string;

  @Prop({ required: true })
  path: string;

  @Prop({ required: true, index: true })
  mimeType: string;

  @Prop({ required: true, index: true })
  size: number;

  @Prop({ index: true })
  driveFileId?: string;

  @Prop({ required: true, index: true })
  driveSyncStatus: DriveSyncStatus;
}

export const FileSchema = SchemaFactory.createForClass(File);

// ✅ Индексы под твои запросы (фильтры + сортировки)
FileSchema.index({ projectName: 1, createdAt: -1 });
FileSchema.index({ projectName: 1, size: -1 });
FileSchema.index({ driveSyncStatus: 1, createdAt: -1 });

// Если часто фильтруешь по типам + сортируешь по дате
FileSchema.index({ mimeType: 1, createdAt: -1 });

// Поиск по имени (лучше чем regex)
FileSchema.index({ originalName: 'text' });
