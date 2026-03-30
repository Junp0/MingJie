import { Module } from '@nestjs/common';
import { ClassificationTasksModule } from '../classification-tasks/classification-tasks.module';
import { ImportTasksController } from './import-tasks.controller';
import { ImportTasksService } from './import-tasks.service';

@Module({
  imports: [ClassificationTasksModule],
  controllers: [ImportTasksController],
  providers: [ImportTasksService],
  exports: [ImportTasksService],
})
export class ImportTasksModule {}
