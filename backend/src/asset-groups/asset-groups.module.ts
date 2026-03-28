import { Module } from '@nestjs/common';
import { AssetGroupsController } from './asset-groups.controller';
import { AssetGroupsService } from './asset-groups.service';

@Module({
  controllers: [AssetGroupsController],
  providers: [AssetGroupsService],
  exports: [AssetGroupsService],
})
export class AssetGroupsModule {}
