import { Module } from '@nestjs/common';
import { ClassificationTemplateDetailsController } from './classification-template-details.controller';
import { ClassificationTemplateDetailsService } from './classification-template-details.service';

@Module({
  controllers: [ClassificationTemplateDetailsController],
  providers: [ClassificationTemplateDetailsService],
  exports: [ClassificationTemplateDetailsService],
})
export class ClassificationTemplateDetailsModule {}
