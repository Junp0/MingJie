import { PartialType } from '@nestjs/swagger';
import { CreateDataAssetDto } from './create-data-asset.dto';

export class UpdateDataAssetDto extends PartialType(CreateDataAssetDto) {}
