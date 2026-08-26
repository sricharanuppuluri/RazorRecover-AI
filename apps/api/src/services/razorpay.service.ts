import { RazorpayClient } from './razorpay/client';
import { env } from '../config/env';

let razorpayClientInstance: RazorpayClient | null = null;

export function getRazorpayClient(): RazorpayClient {
  if (!razorpayClientInstance) {
    razorpayClientInstance = new RazorpayClient({
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
      useMock: process.env.NODE_ENV === 'test' && (!env.RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID.startsWith('rzp_test_Your'))
    });
  }
  return razorpayClientInstance;
}

export function setRazorpayClientInstance(client: RazorpayClient | null): void {
  razorpayClientInstance = client;
}
