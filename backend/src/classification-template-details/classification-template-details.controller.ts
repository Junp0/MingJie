import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClassificationTemplateDetailsService } from './classification-template-details.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateLevelDefinitionDto } from './dto/create-level-definition.dto';
import { UpdateLevelDefinitionDto } from './dto/update-level-definition.dto';
import { CreateDataTypeDto } from './dto/create-data-type.dto';
import { UpdateDataTypeDto } from './dto/update-data-type.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@ApiTags('classification-template-details')
@Controller('classification-template-details')
export class ClassificationTemplateDetailsController {
  constructor(private readonly service: ClassificationTemplateDetailsService) {}

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  removeCategory(@Param('id') id: string) {
    return this.service.removeCategory(id);
  }

  @Post('level-definitions')
  createLevelDefinition(@Body() dto: CreateLevelDefinitionDto) {
    return this.service.createLevelDefinition(dto);
  }

  @Patch('level-definitions/:id')
  updateLevelDefinition(@Param('id') id: string, @Body() dto: UpdateLevelDefinitionDto) {
    return this.service.updateLevelDefinition(id, dto);
  }

  @Delete('level-definitions/:id')
  removeLevelDefinition(@Param('id') id: string) {
    return this.service.removeLevelDefinition(id);
  }

  @Post('data-types')
  createDataType(@Body() dto: CreateDataTypeDto) {
    return this.service.createDataType(dto);
  }

  @Patch('data-types/:id')
  updateDataType(@Param('id') id: string, @Body() dto: UpdateDataTypeDto) {
    return this.service.updateDataType(id, dto);
  }

  @Delete('data-types/:id')
  removeDataType(@Param('id') id: string) {
    return this.service.removeDataType(id);
  }

  @Post('rules')
  createRule(@Body() dto: CreateRuleDto) {
    return this.service.createRule(dto);
  }

  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.service.updateRule(id, dto);
  }

  @Delete('rules/:id')
  removeRule(@Param('id') id: string) {
    return this.service.removeRule(id);
  }
}
