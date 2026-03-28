import { Module } from '@nestjs/common';
import { ClassificationTemplatesController } from './classification-templates.controller';
import { ClassificationTemplatesService } from './classification-templates.service';

@Module({
  controllers: [ClassificationTemplatesController],
  providers: [ClassificationTemplatesService],
  exports: [ClassificationTemplatesService],
})
export class ClassificationTemplatesModule {}
