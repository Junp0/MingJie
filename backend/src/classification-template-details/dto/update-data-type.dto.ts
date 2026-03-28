import { PartialType } from '@nestjs/swagger';
import { CreateDataTypeDto } from './create-data-type.dto';

export class UpdateDataTypeDto extends PartialType(CreateDataTypeDto) {}
