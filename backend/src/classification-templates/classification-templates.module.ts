import { Module } from '@nestjs/common';
import { ClassificationTasksModule } from '../classification-tasks/classification-tasks.module';
import { ClassificationTemplatesController } from './classification-templates.controller';
import { ClassificationTemplatesService } from './classification-templates.service';

@Module({
  imports: [ClassificationTasksModule],
  controllers: [ClassificationTemplatesController],
  providers: [ClassificationTemplatesService],
  exports: [ClassificationTemplatesService],
})
export class ClassificationTemplatesModule {}
