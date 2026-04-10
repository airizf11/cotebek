// cotebek/src/items/items.controller.ts
import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller('items')
@UseGuards(ApiKeyGuard) // <-- Wajib Pasang Satpam!
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateItemDto) {
    return this.itemsService.create(req.appInfo.id, dto, req.user?.id, req.ip);}

  @Get()
findAll(@Req() req: any, @Query() pagination: PaginationDto) { // ✅
  return this.itemsService.findAll(req.appInfo.id, pagination);
}

  @Get(':id')
  findOne(@Req() request: any, @Param('id') id: string) {
    const appId = request.appInfo.id;
    return this.itemsService.findOne(appId, id);
  }

  // Gunakan PUT atau PATCH bebas, Nest bawaannya PATCH, tapi kita ubah ke PUT aja biar gampang
  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(req.appInfo.id, id, dto, req.user?.id, req.ip); // ✅
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.itemsService.remove(req.appInfo.id, id, req.user?.id, req.ip); // ✅
  }
}