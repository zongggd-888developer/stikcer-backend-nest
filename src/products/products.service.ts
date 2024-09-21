import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Product, User } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import * as uuid from 'uuid';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async createProduct(
    createProductDto: CreateProductDto,
    user: User,
  ): Promise<Product> {
    this.logger.log(`Attempting to create a new product for user: ${user.id}`);
    try {
      const productId = parseInt(uuid.v4().replace(/-/g, ''), 16);

      const product = await this.databaseService.$transaction(
        async (prisma) => {
          const product = await prisma.product.create({
            data: {
              id: productId,
              userId: user.id,
              ...createProductDto,
              isPurchased: createProductDto.isPurchased || false,
              subTotal: createProductDto.unitPrice * createProductDto.amount,
            },
          });

          const fileId = parseInt(uuid.v4().replace(/-/g, ''), 16);
          await prisma.file.create({
            data: {
              id: fileId,
              productId: product.id,
              categoryId: createProductDto.categoryId,
              userId: user.id,
              type: createProductDto.fileType,
              isPurchased: false,
              key: `${product.id}`,
              size: createProductDto.fileSize,
            },
          });

          return product;
        },
      );

      return product;
    } catch (error) {
      this.logger.error(
        `Failed to create product: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create product');
    }
  }

  async findAllProducts(user: User): Promise<Product[]> {
    this.logger.log(`Attempting to find all products for user: ${user.id}`);
    try {
      const products = await this.databaseService.product.findMany({
        where: user.role === 'USER' ? { userId: user.id } : {},
        include: { category: true },
      });

      return products;
    } catch (error) {
      this.logger.error(
        `Failed to fetch products: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch products');
    }
  }

  async findProductById(id: number, user: User): Promise<Product> {
    this.logger.log(`Attempting to find product with id: ${id}`);
    try {
      const product = await this.databaseService.product.findUnique({
        where: { id },
        include: { category: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (user.role === 'USER' && product.userId !== user.id) {
        throw new ForbiddenException(
          'You are not authorized to access this product',
        );
      }

      return product;
    } catch (error) {
      this.logger.error(
        `Failed to fetch product: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateProductById(
    id: number,
    updateProductDto: UpdateProductDto,
    user: User,
  ): Promise<Product> {
    this.logger.log(`Attempting to update product with id: ${id}`);
    try {
      const existingProduct = await this.databaseService.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new NotFoundException('Product not found');
      }

      if (user.role !== 'ADMIN' && existingProduct.userId !== user.id) {
        throw new ForbiddenException(
          'You are not authorized to update this product',
        );
      }

      const updatedProduct = await this.databaseService.product.update({
        where: { id },
        data: updateProductDto,
      });

      return updatedProduct;
    } catch (error) {
      this.logger.error(
        `Failed to update product: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteProductById(id: number, user: User): Promise<void> {
    this.logger.log(`Attempting to delete product with id: ${id}`);
    try {
      const existingProduct = await this.databaseService.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        throw new NotFoundException('Product not found');
      }

      if (user.role !== 'ADMIN' && existingProduct.userId !== user.id) {
        throw new ForbiddenException(
          'You are not authorized to delete this product',
        );
      }

      await this.databaseService.product.delete({ where: { id } });
    } catch (error) {
      this.logger.error(
        `Failed to delete product: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAllProductsByUserId(
    userId: number,
    user: User,
  ): Promise<Product[]> {
    this.logger.log(
      `Attempting to find all products for user with id: ${userId}`,
    );
    try {
      if (user.role !== 'ADMIN' && user.id !== userId) {
        throw new ForbiddenException(
          'You are not authorized to access these products',
        );
      }

      const products = await this.databaseService.product.findMany({
        where: { userId },
        include: { category: true },
      });

      return products;
    } catch (error) {
      this.logger.error(
        `Failed to fetch products: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAllProductsByCategoryId(
    categoryId: number,
    user: User,
  ): Promise<Product[]> {
    this.logger.log(
      `Attempting to find all products for category with id: ${categoryId}`,
    );
    try {
      const products = await this.databaseService.product.findMany({
        where: {
          categoryId,
          ...(user.role === 'USER' ? { userId: user.id } : {}),
        },
        include: { category: true },
      });

      return products;
    } catch (error) {
      this.logger.error(
        `Failed to fetch products: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch products');
    }
  }
}
