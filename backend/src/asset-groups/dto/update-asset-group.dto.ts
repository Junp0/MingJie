import { PartialType } from '@nestjs/swagger';
import { CreateAssetGroupDto } from './create-asset-group.dto';

export class UpdateAssetGroupDto extends PartialType(CreateAssetGroupDto) {}
