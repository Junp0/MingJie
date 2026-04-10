import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AssetGroupsService } from './asset-groups.service';
import { CreateAssetGroupDto } from './dto/create-asset-group.dto';
import { UpdateAssetGroupDto } from './dto/update-asset-group.dto';

@ApiTags('asset-groups')
@Controller('asset-groups')
export class AssetGroupsController {
  constructor(private readonly assetGroupsService: AssetGroupsService) {}

  @Get('departments')
  findDepartments() {
    return this.assetGroupsService.findDepartments();
  }

  @Get()
  findAll() {
    return this.assetGroupsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateAssetGroupDto) {
    return this.assetGroupsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssetGroupDto) {
    return this.assetGroupsService.update(id, dto);
  }

  @Delete('departments/:id')
  removeDepartment(@Param('id') id: string) {
    return this.assetGroupsService.removeDepartment(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetGroupsService.remove(id);
  }
}
