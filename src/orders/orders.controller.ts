import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({
    status: 201,
    description: 'The order has been successfully created.',
  })
  @ApiBody({ type: CreateOrderDto })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.ordersService.createOrder(createOrderDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Returns all orders.' })
  @ApiParam({ name: 'page', type: 'number' })
  @ApiParam({ name: 'limit', type: 'number' })
  async getAllOrders(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Request() req,
  ) {
    return this.ordersService.findAllOrders(req.user, page, limit);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get orders by user ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns orders for the specified user.',
  })
  @ApiParam({ name: 'page', type: 'number' })
  @ApiParam({ name: 'limit', type: 'number' })
  @ApiParam({ name: 'userId', type: 'string' })
  async getOrdersByUserId(
    @Param('userId') userId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Request() req,
  ) {
    return this.ordersService.findOrdersByUserId(userId, req.user, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiResponse({ status: 200, description: 'Returns the order.' })
  @ApiParam({ name: 'id', type: 'string' })
  async getOrderById(@Param('id') id: string, @Request() req) {
    return this.ordersService.findOrderById(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an order' })
  @ApiResponse({
    status: 200,
    description: 'The order has been successfully updated.',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: UpdateOrderDto })
  async updateOrder(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req,
  ) {
    return this.ordersService.updateOrderById(id, updateOrderDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order' })
  @ApiResponse({
    status: 204,
    description: 'The order has been successfully deleted.',
  })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrder(@Param('id') id: string, @Request() req) {
    await this.ordersService.deleteOrderById(id, req.user);
  }
}
