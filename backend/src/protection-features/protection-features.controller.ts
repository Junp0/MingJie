import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProtectionFeatureType } from '@prisma/client';
import { ProtectionFeaturesService } from './protection-features.service';
import { CreateProtectionFeatureDto } from './dto/create-protection-feature.dto';
import { UpdateProtectionFeatureDto } from './dto/update-protection-feature.dto';

@ApiTags('protection-features')
@Controller('protection-features')
export class ProtectionFeaturesController {
  constructor(private readonly protectionFeaturesService: ProtectionFeaturesService) {}

  @Get()
  findAll(@Query('type') type?: ProtectionFeatureType) {
    return this.protectionFeaturesService.findAll(type);
  }

  @Post()
  create(@Body() dto: CreateProtectionFeatureDto) {
    return this.protectionFeaturesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProtectionFeatureDto) {
    return this.protectionFeaturesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.protectionFeaturesService.remove(id);
  }
}
