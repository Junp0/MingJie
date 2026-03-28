import { PartialType } from '@nestjs/swagger';
import { CreateProtectionFeatureDto } from './create-protection-feature.dto';

export class UpdateProtectionFeatureDto extends PartialType(CreateProtectionFeatureDto) {}
