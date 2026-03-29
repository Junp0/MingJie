import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ImportTasksService } from './import-tasks.service';
import { CreateImportTaskDto } from './dto/create-import-task.dto';
import { DiscoverImportDatabasesDto } from './dto/discover-import-databases.dto';
import { UpdateImportTaskDto } from './dto/update-import-task.dto';

@ApiTags('import-tasks')
@Controller('import-tasks')
export class ImportTasksController {
  constructor(private readonly importTasksService: ImportTasksService) {}

  @Get()
  findAll() {
    return this.importTasksService.findAll();
  }

  @Post('discover-databases')
  discoverDatabases(@Body() dto: DiscoverImportDatabasesDto) {
    return this.importTasksService.discoverDatabases(dto);
  }

  @Post()
  create(@Body() dto: CreateImportTaskDto) {
    return this.importTasksService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateImportTaskDto) {
    return this.importTasksService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.importTasksService.remove(id);
  }
}
