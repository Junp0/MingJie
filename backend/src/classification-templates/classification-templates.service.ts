import { Injectable } from '@nestjs/common';
import { TemplateStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassificationTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    const count = await this.prisma.classificationTemplate.count();
    if (count > 0) return;

    const template = await this.prisma.classificationTemplate.create({
      data: {
        templateName: '默认分类分级模板',
        templateType: 'built-in',
        description: '用于演示数据分类目录、级别与识别规则的默认模板',
        status: TemplateStatus.ACTIVE,
      },
    });

    const category = await this.prisma.classificationCategory.create({
      data: {
        templateId: template.id,
        name: '个人信息',
        description: '用户身份与联系方式',
        sortOrder: 1,
      },
    });

    const level = await this.prisma.classificationLevelDefinition.create({
      data: {
        templateId: template.id,
        code: 'L3',
        name: '敏感',
        color: 'red',
        description: '敏感个人数据',
        isSensitive: true,
        needMask: true,
        needEncrypt: true,
      },
    });

    const dataType = await this.prisma.classificationDataType.create({
      data: {
        templateId: template.id,
        categoryId: category.id,
        levelDefinitionId: level.id,
        name: '手机号',
        isSensitive: true,
        needMask: true,
        needEncrypt: true,
      },
    });

    await this.prisma.classificationRule.create({
      data: {
        dataTypeId: dataType.id,
        target: 'columnName',
        matcher: 'contains',
        value: 'phone,mobile',
        hitRate: 85,
        sortOrder: 1,
      },
    });
  }

  async findAll() {
    await this.seed();
    return this.prisma.classificationTemplate.findMany({
      include: {
        categories: true,
        levelDefinitions: true,
        dataTypes: {
          include: {
            category: true,
            levelDefinition: true,
            rules: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    await this.seed();
    return this.prisma.classificationTemplate.findUnique({
      where: { id },
      include: {
        categories: true,
        levelDefinitions: true,
        dataTypes: {
          include: {
            category: true,
            levelDefinition: true,
            rules: true,
          },
        },
      },
    });
  }
}
