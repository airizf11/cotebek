// cotebek/src/items/items.controller.ts
import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';

@Controller('items')
@UseGuards(ApiKeyGuard) // <-- Wajib Pasang Satpam!
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@Req() request: any, @Body() createItemDto: CreateItemDto) {
    const appId = request.appInfo.id;
    return this.itemsService.create(appId, createItemDto);
  }

  @Get()
  findAll(@Req() request: any) {
    const appId = request.appInfo.id;
    return this.itemsService.findAll(appId);
  }

  @Get(':id')
  findOne(@Req() request: any, @Param('id') id: string) {
    const appId = request.appInfo.id;
    return this.itemsService.findOne(appId, id);
  }

  // Gunakan PUT atau PATCH bebas, Nest bawaannya PATCH, tapi kita ubah ke PUT aja biar gampang
  @Put(':id')
  update(@Req() request: any, @Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
    const appId = request.appInfo.id;
    return this.itemsService.update(appId, id, updateItemDto);
  }

  @Delete(':id')
  remove(@Req() request: any, @Param('id') id: string) {
    const appId = request.appInfo.id;
    return this.itemsService.remove(appId, id);
  }
}