import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClassificationTemplatesService } from './classification-templates.service';
import { CreateClassificationTemplateDto } from './dto/create-classification-template.dto';
import { UpdateClassificationTemplateDto } from './dto/update-classification-template.dto';

@ApiTags('classification-templates')
@Controller('classification-templates')
export class ClassificationTemplatesController {
  constructor(private readonly classificationTemplatesService: ClassificationTemplatesService) {}

  @Get()
  findAll() {
    return this.classificationTemplatesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateClassificationTemplateDto) {
    return this.classificationTemplatesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classificationTemplatesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClassificationTemplateDto) {
    return this.classificationTemplatesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classificationTemplatesService.remove(id);
  }

  @Post(':id/initialize')
  initialize(@Param('id') id: string) {
    return this.classificationTemplatesService.initialize(id);
  }
}
