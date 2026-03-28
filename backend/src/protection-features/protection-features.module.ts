import { Module } from '@nestjs/common';
import { ProtectionFeaturesController } from './protection-features.controller';
import { ProtectionFeaturesService } from './protection-features.service';

@Module({
  controllers: [ProtectionFeaturesController],
  providers: [ProtectionFeaturesService],
  exports: [ProtectionFeaturesService],
})
export class ProtectionFeaturesModule {}
