import { PartialType } from '@nestjs/swagger';
import { CreateImportTaskDto } from './create-import-task.dto';

export class UpdateImportTaskDto extends PartialType(CreateImportTaskDto) {}
