import { Module } from '@nestjs/common';
import { ImportTasksController } from './import-tasks.controller';
import { ImportTasksService } from './import-tasks.service';

@Module({
  controllers: [ImportTasksController],
  providers: [ImportTasksService],
  exports: [ImportTasksService],
})
export class ImportTasksModule {}
