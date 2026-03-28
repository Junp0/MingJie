import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClassificationTasksService } from './classification-tasks.service';
import { CreateClassificationTaskDto } from './dto/create-classification-task.dto';
import { UpdateClassificationTaskDto } from './dto/update-classification-task.dto';

@ApiTags('classification-tasks')
@Controller('classification-tasks')
export class ClassificationTasksController {
  constructor(private readonly classificationTasksService: ClassificationTasksService) {}

  @Get()
  findAll() {
    return this.classificationTasksService.findAll();
  }

  @Post()
  create(@Body() dto: CreateClassificationTaskDto) {
    return this.classificationTasksService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClassificationTaskDto) {
    return this.classificationTasksService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classificationTasksService.remove(id);
  }
}
