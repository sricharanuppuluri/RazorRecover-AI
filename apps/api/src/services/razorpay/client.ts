import { CreateRazorpayOrderInput, RazorpayOrderResponse } from '@razorrecover/shared-types';

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  useMock?: boolean;
}

export class RazorpayServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'RazorpayServiceError';
  }
}

export class RazorpayClient {
  private keyId: string;
  private keySecret: string;
  private useMock: boolean;

  constructor(config: RazorpayConfig) {
    this.keyId = config.keyId || '';
    this.keySecret = config.keySecret || '';
    // Use mock mode if explicitly requested or if credentials are empty/placeholder
    this.useMock = config.useMock || !this.keyId || !this.keySecret || this.keyId.startsWith('rzp_test_Your');
  }

  public isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret && !this.keyId.startsWith('rzp_test_Your'));
  }

  public getKeyId(): string {
    return this.keyId;
  }

  /**
   * Create a Razorpay order in Test Mode.
   * Amount MUST be in smallest currency units (paise for INR).
   */
  public async createOrder(input: CreateRazorpayOrderInput): Promise<RazorpayOrderResponse> {
    // 1. Input Validation
    if (!input.amount || !Number.isInteger(input.amount) || input.amount <= 0) {
      throw new RazorpayServiceError('Amount must be a positive integer in smallest currency units (paise)', 400);
    }

    const currency = input.currency || 'INR';

    // 2. Mock mode for tests or unconfigured dev environments
    if (this.useMock) {
      const mockOrderId = `order_mock_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
      return {
        id: mockOrderId,
        entity: 'order',
        amount: input.amount,
        amount_paid: 0,
        amount_due: input.amount,
        currency,
        receipt: input.receipt || `rcpt_${Date.now()}`,
        status: 'created',
        attempts: 0,
        notes: input.notes || {},
        created_at: Math.floor(Date.now() / 1000)
      };
    }

    // 3. Real Razorpay API call
    const authString = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    try {
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        body: JSON.stringify({
          amount: input.amount,
          currency,
          receipt: input.receipt,
          notes: input.notes
        })
      });

      const data: any = await response.json();

      if (!response.ok) {
        const errorMessage = data?.error?.description || data?.error?.reason || 'Razorpay API Order Creation Failed';
        throw new RazorpayServiceError(errorMessage, response.status, data?.error);
      }

      return data as RazorpayOrderResponse;
    } catch (err: any) {
      if (err instanceof RazorpayServiceError) {
        throw err;
      }
      throw new RazorpayServiceError(`Razorpay Connection Failed: ${err.message}`, 502);
    }
  }
}
