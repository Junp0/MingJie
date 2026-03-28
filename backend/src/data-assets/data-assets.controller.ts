import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataAssetsService } from './data-assets.service';
import { CreateDataAssetDto } from './dto/create-data-asset.dto';
import { UpdateDataAssetDto } from './dto/update-data-asset.dto';

@ApiTags('data-assets')
@Controller('data-assets')
export class DataAssetsController {
  constructor(private readonly dataAssetsService: DataAssetsService) {}

  @Get()
  findAll() {
    return this.dataAssetsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateDataAssetDto) {
    return this.dataAssetsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDataAssetDto) {
    return this.dataAssetsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dataAssetsService.remove(id);
  }
}
