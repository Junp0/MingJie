import { PartialType } from '@nestjs/swagger';
import { CreateClassificationTemplateDto } from './create-classification-template.dto';

export class UpdateClassificationTemplateDto extends PartialType(CreateClassificationTemplateDto) {}
