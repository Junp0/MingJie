import { PartialType } from '@nestjs/swagger';
import { CreateLevelDefinitionDto } from './create-level-definition.dto';

export class UpdateLevelDefinitionDto extends PartialType(CreateLevelDefinitionDto) {}
