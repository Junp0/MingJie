import { Module } from '@nestjs/common';
import { ClassificationTasksController } from './classification-tasks.controller';
import { ClassificationTasksService } from './classification-tasks.service';

@Module({
  controllers: [ClassificationTasksController],
  providers: [ClassificationTasksService],
  exports: [ClassificationTasksService],
})
export class ClassificationTasksModule {}
