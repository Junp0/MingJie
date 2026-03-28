import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateLevelDefinitionDto } from './dto/create-level-definition.dto';
import { UpdateLevelDefinitionDto } from './dto/update-level-definition.dto';
import { CreateDataTypeDto } from './dto/create-data-type.dto';
import { UpdateDataTypeDto } from './dto/update-data-type.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Injectable()
export class ClassificationTemplateDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.classificationCategory.create({
      data: {
        templateId: dto.templateId,
        name: dto.name,
        parentId: dto.parentId,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  updateCategory(id: string, dto: UpdateCategoryDto) {
    return this.prisma.classificationCategory.update({
      where: { id },
      data: dto,
    });
  }

  removeCategory(id: string) {
    return this.prisma.classificationCategory.delete({ where: { id } });
  }

  createLevelDefinition(dto: CreateLevelDefinitionDto) {
    return this.prisma.classificationLevelDefinition.create({
      data: {
        templateId: dto.templateId,
        code: dto.code,
        name: dto.name,
        color: dto.color,
        description: dto.description,
        isSensitive: dto.isSensitive ?? false,
        needMask: dto.needMask ?? false,
        needEncrypt: dto.needEncrypt ?? false,
        note: dto.note,
      },
    });
  }

  updateLevelDefinition(id: string, dto: UpdateLevelDefinitionDto) {
    return this.prisma.classificationLevelDefinition.update({
      where: { id },
      data: dto,
    });
  }

  removeLevelDefinition(id: string) {
    return this.prisma.classificationLevelDefinition.delete({ where: { id } });
  }

  createDataType(dto: CreateDataTypeDto) {
    return this.prisma.classificationDataType.create({
      data: {
        templateId: dto.templateId,
        categoryId: dto.categoryId,
        levelDefinitionId: dto.levelDefinitionId,
        name: dto.name,
        isSensitive: dto.isSensitive ?? false,
        needMask: dto.needMask ?? false,
        needEncrypt: dto.needEncrypt ?? false,
      },
      include: {
        category: true,
        levelDefinition: true,
        rules: true,
      },
    });
  }

  updateDataType(id: string, dto: UpdateDataTypeDto) {
    return this.prisma.classificationDataType.update({
      where: { id },
      data: dto,
      include: {
        category: true,
        levelDefinition: true,
        rules: true,
      },
    });
  }

  removeDataType(id: string) {
    return this.prisma.classificationDataType.delete({ where: { id } });
  }

  createRule(dto: CreateRuleDto) {
    return this.prisma.classificationRule.create({
      data: {
        dataTypeId: dto.dataTypeId,
        target: dto.target,
        matcher: dto.matcher,
        value: dto.value,
        hitRate: dto.hitRate,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  updateRule(id: string, dto: UpdateRuleDto) {
    return this.prisma.classificationRule.update({
      where: { id },
      data: dto,
    });
  }

  removeRule(id: string) {
    return this.prisma.classificationRule.delete({ where: { id } });
  }
}
