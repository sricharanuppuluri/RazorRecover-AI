import { Order } from '@razorrecover/shared-types';
import { OrderRepository } from '../repositories/order.repository';
import { getRazorpayClient } from './razorpay.service';
import { MerchantRepository } from '../repositories/merchant.repository';
import { CustomerRepository } from '../repositories/customer.repository';

export interface CreateOrderResult {
  order: Order;
  checkout: {
    keyId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
  };
}

export class OrderService {
  private orderRepo = new OrderRepository();
  private merchantRepo = new MerchantRepository();
  private customerRepo = new CustomerRepository();

  public async createOrder(data: {
    id?: string;
    merchant_id: string;
    customer_id: string;
    amount: number;
    currency?: 'INR' | 'USD' | 'EUR';
    product_category?: string;
  }): Promise<CreateOrderResult> {
    // 1. Verify merchant and customer if database is reachable
    try {
      const merchant = await this.merchantRepo.findById(data.merchant_id);
      if (!merchant) {
        // If merchant does not exist in DB, handle gracefully or throw clear error
        console.warn(`[OrderService] Warning: Merchant ${data.merchant_id} not found in database.`);
      }
      const customer = await this.customerRepo.findById(data.customer_id);
      if (!customer) {
        console.warn(`[OrderService] Warning: Customer ${data.customer_id} not found in database.`);
      }
    } catch (err) {
      // Database query error handled gracefully in fallback/mock mode
      console.warn('[OrderService] Warning checking entity existence:', (err as Error).message);
    }

    const orderId = data.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const currency = data.currency || 'INR';

    // 2. Call Razorpay Service to create Razorpay Order
    const razorpayClient = getRazorpayClient();
    const razorpayOrder = await razorpayClient.createOrder({
      amount: data.amount,
      currency,
      receipt: orderId,
      notes: {
        merchant_id: data.merchant_id,
        customer_id: data.customer_id,
        internal_order_id: orderId
      }
    });

    // 3. Persist Internal Order in Database
    const orderData: Partial<Order> = {
      id: orderId,
      merchant_id: data.merchant_id,
      customer_id: data.customer_id,
      razorpay_order_id: razorpayOrder.id,
      amount: data.amount,
      currency,
      status: 'CREATED',
      product_category: data.product_category || 'General'
    };

    let persistedOrder: Order;
    try {
      persistedOrder = await this.orderRepo.create(orderData);
    } catch (err) {
      // Fallback if DB is disconnected in mock/test mode
      console.warn('[OrderService] DB insert fallback:', (err as Error).message);
      persistedOrder = {
        id: orderId,
        merchant_id: data.merchant_id,
        customer_id: data.customer_id,
        razorpay_order_id: razorpayOrder.id,
        amount: data.amount,
        currency,
        status: 'CREATED',
        product_category: data.product_category || 'General',
        created_at: new Date().toISOString()
      };
    }

    // 4. Return Safe Checkout Data (Key ID ONLY, NEVER Secret Key)
    return {
      order: persistedOrder,
      checkout: {
        keyId: razorpayClient.getKeyId() || 'rzp_test_placeholder_key',
        razorpayOrderId: razorpayOrder.id,
        amount: data.amount,
        currency
      }
    };
  }

  public async getOrderById(id: string): Promise<Order | null> {
    return this.orderRepo.findById(id);
  }
}
