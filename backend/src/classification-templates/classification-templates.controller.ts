import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClassificationTemplatesService } from './classification-templates.service';

@ApiTags('classification-templates')
@Controller('classification-templates')
export class ClassificationTemplatesController {
  constructor(private readonly classificationTemplatesService: ClassificationTemplatesService) {}

  @Get()
  findAll() {
    return this.classificationTemplatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classificationTemplatesService.findOne(id);
  }
}
