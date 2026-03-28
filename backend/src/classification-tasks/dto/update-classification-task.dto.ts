import { PartialType } from '@nestjs/swagger';
import { CreateClassificationTaskDto } from './create-classification-task.dto';

export class UpdateClassificationTaskDto extends PartialType(CreateClassificationTaskDto) {}
