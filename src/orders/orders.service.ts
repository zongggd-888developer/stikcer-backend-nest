import { Injectable } from '@nestjs/common';
import { Order } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { CreateOrderDataDto } from './dto/create-order.dto';
import * as uuid from 'uuid'

@Injectable()
export class OrdersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async InsertOrderWithLines(createOrderDataDto: CreateOrderDataDto): Promise<{ order: Order, err: string }> {
    try {
      const orderId: number = parseInt(uuid.v4().split('-').join(''), 16)
      return this.databaseService.$transaction(async (prisma) => {

        //calcuilate subtotal
        let subTotal = 0
        for (let i = 0; i < createOrderDataDto.items.length; i++) {
          const item = createOrderDataDto.items[i]
          const product = await prisma.product.findUnique({
            where: {
              id: item.productId
            }
          })

          subTotal += product.unitPrice * product.amount
        }

        //create order
        const createdOrder = await prisma.order.create({
          data: {
            id: orderId,
            userId: createOrderDataDto.userId,
            orderSubTotal: subTotal,
            shippingFee: createOrderDataDto.shippingFee,
            shippingMethod: createOrderDataDto.shippingMethod,
            paymentId: createOrderDataDto.paymentId,
            status: "pending"
          }
        })

        //create order lines
        for (let i = 0; i < createOrderDataDto.items.length; i++) {
          const item = createOrderDataDto.items[i]
          await prisma.orderLine.createMany({
            data: {
              orderId: orderId,
              productId: item.productId
            }
          })
        }

        return { 
          order: createdOrder, 
          err: null 
        }
      })
    } catch (err) {
      console.log("Error: ", err)
      return { 
        order: null, 
        err 
      }
    }
  }

  async FindAllOrders(): Promise<{ orders: Order[], err: string }> {
    try {
      const orders = await this.databaseService.order.findMany({
        include: {
          orderLines: true
        }
      })

      return {
        orders,
        err: null
      }
    } catch (err) {
      console.log("Error: ", err)
      return {
        orders: null,
        err
      }
    }
  }

  async FindOwnOrders(userId: number): Promise<{ orders: Order[], err: string }> {
    try {
      const orders = await this.databaseService.order.findMany({
        where: {
          userId
        },
        include: {
          orderLines: true
        }
      })

      return {
        orders,
        err: null
      }
    } catch (err) {
      console.log("Error: ", err)
      return {
        orders: null,
        err
      }
    }
  }

  async FindOrderById(id: number, req: Request): Promise<{ order: Order, err: string }> {
    try {
      const order = await this.databaseService.order.findUnique({
        where: {
          id
        },
        include: {
          orderLines: true
        }
      })

      // role: admin
      if (req['user'].roleId === 1) {
        if (!order) {
          return {
            order: null,
            err: "not found this order"
          }
        }

        return {
          order,
          err: null
        }
      } 
      // role: user
      else if (req['user'].roleId === 2) {
        // ownership validation
        if (order && order.userId === req['user'].id) {
          return {
            order,
            err: null
          }
        } else {
          return {
            order: null,
            err: "you are not authorized to access this order"
          }
        }
      }
    } catch (err) {
      console.log("Error: ", err)
      return {
        order: null,
        err: err.message
      }
    }  
  }

  async DeleteOrderById(id: number, req: Request): Promise<{ err: string }> {
    try {
      const order = await this.databaseService.order.findUnique({
        where: {
          id
        }
      })

      // role: admin
      if (req['user'].roleId === 1) {
        if (!order) {
          return {
            err: "not found this order"
          }
        }

        await this.databaseService.order.delete({
          where: {
            id
          }
        })

        return {
          err: null
        }
      }
      // role: user
      else if (req['user'].roleId === 2) {
        // ownership validation
        if (order && order.userId === req['user'].id) {
          await this.databaseService.order.delete({
            where: {
              id
            }
          })

          return {
            err: null
          }
        } else {
          return {
            err: "you are not authorized to access this order"
          }
        }
      }
    } catch (err) {
      console.log("Error: ", err)
      return {
        err: err.message
      }
    }  
  }
}
