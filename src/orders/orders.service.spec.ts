import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { DatabaseService } from '../database/database.service';
import {
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, User } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockDatabaseService = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create an order', async () => {
      const createOrderDto: CreateOrderDto = {
        items: [{ productId: '1', orderId: '1' }],
        orderSubTotal: 200,
        shippingFee: 10,
        shippingMethod: 'Standard',
        paymentId: 'payment123',
        status: 'AWAITING_PAYMENT',
        id: '1',
        userId: '1',
      };
      const user: User = { id: '1', role: 'USER' } as User;
      const product = { id: '1', unitPrice: 100, amount: 2 };
      const order = {
        id: '1',
        ...createOrderDto,
        userId: user.id,
        orderSubTotal: 200,
      };

      mockDatabaseService.product.findUnique.mockResolvedValue(product);
      mockDatabaseService.$transaction.mockResolvedValue(order);

      const result = await service.createOrder(createOrderDto, user);

      expect(result).toEqual(order);
      expect(mockDatabaseService.$transaction).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if creation fails', async () => {
      const createOrderDto: CreateOrderDto = {
        items: [{ productId: '1', orderId: '1' }],
        shippingFee: 10,
        shippingMethod: 'Standard',
        paymentId: 'payment123',
        status: 'AWAITING_PAYMENT',
        orderSubTotal: 200,
        id: '1',
        userId: '1',
      };
      const user: User = { id: '1', role: 'USER' } as User;

      mockDatabaseService.$transaction.mockImplementation(() => {
        throw new InternalServerErrorException('Failed to create order');
      });

      await expect(service.createOrder(createOrderDto, user)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAllOrders', () => {
    it('should return paginated orders for admin', async () => {
      const user: User = { id: '1', role: 'ADMIN' } as User;
      const orders: Order[] = [
        {
          id: '1',
          userId: '1',
          orderSubTotal: 200,
          shippingFee: 10,
          shippingMethod: 'Standard',
          paymentId: 'payment123',
          status: 'AWAITING_PAYMENT',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDatabaseService.$transaction.mockResolvedValue([orders, 1]);

      const result = await service.findAllOrders(user, 1, 10);

      expect(result).toEqual({ orders, total: 1, page: 1, total_pages: 1 });
      expect(mockDatabaseService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should throw BadRequestException for invalid page or limit', async () => {
      const user: User = { id: '1', role: 'ADMIN' } as User;

      await expect(service.findAllOrders(user, 0, 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findAllOrders(user, 1, 0)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOrdersByUserId', () => {
    it('should return paginated orders for a specific user', async () => {
      const user: User = { id: '1', role: 'ADMIN' } as User;
      const orders: Order[] = [
        {
          id: '1',
          userId: '1',
          orderSubTotal: 200,
          shippingFee: 10,
          shippingMethod: 'Standard',
          paymentId: 'payment123',
          status: 'AWAITING_PAYMENT',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDatabaseService.$transaction.mockResolvedValue([orders, 1]);

      const result = await service.findOrdersByUserId('1', user, 1, 10);

      expect(result).toEqual({ orders, total: 1, page: 1, total_pages: 1 });
      expect(mockDatabaseService.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const user: User = { id: '2', role: 'USER' } as User;

      await expect(
        service.findOrdersByUserId('1', user, 1, 10),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid page or limit', async () => {
      const user: User = { id: '1', role: 'ADMIN' } as User;

      await expect(
        service.findOrdersByUserId('1', user, 0, 10),
      ).rejects.toThrow(BadRequestException);
      await expect(service.findOrdersByUserId('1', user, 1, 0)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOrderById', () => {
    it('should return an order by ID', async () => {
      const user: User = { id: '1', role: 'USER' } as User;
      const order: Order = {
        id: '1',
        userId: '1',
        orderSubTotal: 200,
        shippingFee: 10,
        shippingMethod: 'Standard',
        paymentId: 'payment123',
        status: 'AWAITING_PAYMENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabaseService.order.findUnique.mockResolvedValue(order);

      const result = await service.findOrderById('1', user);

      expect(result).toEqual(order);
      expect(mockDatabaseService.order.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { orderLines: true },
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      const user: User = { id: '1', role: 'USER' } as User;

      mockDatabaseService.order.findUnique.mockResolvedValue(null);

      await expect(service.findOrderById('1', user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const user: User = { id: '2', role: 'USER' } as User;
      const order: Order = {
        id: '1',
        userId: '1',
        orderSubTotal: 200,
        shippingFee: 10,
        shippingMethod: 'Standard',
        paymentId: 'payment123',
        status: 'AWAITING_PAYMENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabaseService.order.findUnique.mockResolvedValue(order);

      await expect(service.findOrderById('1', user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateOrderById', () => {
    it('should update an order', async () => {
      const updateOrderDto: UpdateOrderDto = {
        status: 'Shipped',
      };
      const user: User = { id: '1', role: 'ADMIN' } as User;
      const existingOrder: Order = {
        id: '1',
        userId: '1',
        orderSubTotal: 200,
        shippingFee: 10,
        shippingMethod: 'Standard',
        paymentId: 'payment123',
        status: 'AWAITING_PAYMENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedOrder: Order = {
        id: '1',
        userId: '1',
        orderSubTotal: 200,
        shippingFee: 15,
        shippingMethod: 'Standard',
        paymentId: 'payment123',
        status: 'SHIPPED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabaseService.order.findUnique.mockResolvedValue(existingOrder);
      mockDatabaseService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.updateOrderById('1', updateOrderDto, user);

      expect(result).toEqual(updatedOrder);
      expect(mockDatabaseService.order.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateOrderDto,
        include: { orderLines: true },
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      const updateOrderDto: UpdateOrderDto = {
        status: 'SHIPPED',
      };
      const user: User = { id: '1', role: 'ADMIN' } as User;

      mockDatabaseService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderById('1', updateOrderDto, user),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const updateOrderDto: UpdateOrderDto = {
        status: 'Shipped',
      };
      const user: User = { id: '2', role: 'USER' } as User;
      const existingOrder: Order = {
        id: '1',
        userId: '1',
        orderSubTotal: 200,
        shippingFee: 10,
        shippingMethod: 'Standard',
        paymentId: 'payment123',
        status: 'AWAITING_PAYMENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabaseService.order.findUnique.mockResolvedValue(existingOrder);

      await expect(
        service.updateOrderById('1', updateOrderDto, user),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteOrderById', () => {
    it('should delete an order', async () => {
      const user: User = { id: '1', role: 'ADMIN' } as User;
      const existingOrder: Order = {
        id: '1',
        userId: '1',
        orderSubTotal: 200,
        shippingFee: 10,
        shippingMethod: 'Standard',
        paymentId: 'payment123',
        status: 'AWAITING_PAYMENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabaseService.order.findUnique.mockResolvedValue(existingOrder);
      mockDatabaseService.order.delete.mockResolvedValue(undefined);

      await service.deleteOrderById('1', user);

      expect(mockDatabaseService.order.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      const user: User = { id: '1', role: 'ADMIN' } as User;

      mockDatabaseService.order.findUnique.mockResolvedValue(null);

      await expect(service.deleteOrderById('1', user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const user: User = { id: '2', role: 'USER' } as User;
      const existingOrder: Order = {
        id: '1',
        userId: '1',
        orderSubTotal: 200,
        shippingFee: 10,
        shippingMethod: 'Standard',
        paymentId: 'payment123',
        status: 'AWAITING_PAYMENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDatabaseService.order.findUnique.mockResolvedValue(existingOrder);

      await expect(service.deleteOrderById('1', user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
