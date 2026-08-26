import React, { useState } from 'react';
import { ShoppingCart, CreditCard, CheckCircle, AlertTriangle, ExternalLink, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface CreateOrderResponse {
  order: {
    id: string;
    merchant_id: string;
    customer_id: string;
    razorpay_order_id: string;
    amount: number;
    currency: string;
    status: string;
    product_category?: string;
  };
  checkout: {
    keyId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
  };
}

export const CheckoutDemo: React.FC = () => {
  const [merchantId, setMerchantId] = useState('mch_test_01');
  const [customerId, setCustomerId] = useState('cust_01');
  const [amountRupees, setAmountRupees] = useState<number>(7500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<CreateOrderResponse | null>(null);
  const [checkoutCallback, setCheckoutCallback] = useState<{
    completed: boolean;
    paymentId?: string;
    orderId?: string;
    signature?: string;
    note: string;
  } | null>(null);

  const amountPaise = Math.round(amountRupees * 100);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrderResult(null);
    setCheckoutCallback(null);

    try {
      const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiBase}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId,
          customerId,
          amount: amountPaise,
          currency: 'INR'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to create order');
      }

      setOrderResult(data.data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOpenCheckout = async () => {
    if (!orderResult) return;

    setError(null);
    const loaded = await loadRazorpayScript();

    if (!loaded) {
      setError('Failed to load Razorpay Checkout SDK script. Please check your internet connection.');
      return;
    }

    const { checkout } = orderResult;

    const options = {
      key: checkout.keyId || 'rzp_test_placeholder_key',
      amount: checkout.amount,
      currency: checkout.currency,
      name: 'RazorRecover AI Demo',
      description: 'Test Mode Checkout Transaction',
      order_id: checkout.razorpayOrderId,
      handler: function (response: any) {
        setCheckoutCallback({
          completed: true,
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
          note: 'Browser checkout callback received. Note: Frontend callbacks are non-authoritative. Server payment verification will occur via webhooks in Phase 3.'
        });
      },
      prefill: {
        name: 'Demo Merchant Customer',
        email: 'customer@example.com',
        contact: '9876543210'
      },
      theme: {
        color: '#06b6d4'
      },
      modal: {
        ondismiss: function () {
          console.log('[Razorpay Checkout] Checkout modal closed by user');
        }
      }
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.warn('[Razorpay Checkout Payment Failed]', response.error);
        setError(`Checkout Payment Attempt Failed: ${response.error.description || response.error.reason}`);
      });
      rzp.open();
    } catch (err: any) {
      setError(`Failed to launch Razorpay Checkout: ${err.message}`);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-8 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Phase 2: Razorpay Test Mode Checkout
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                TEST MODE ONLY
              </span>
            </h2>
            <p className="text-xs text-slate-400">Create Razorpay orders and trigger Test Mode Checkout modal</p>
          </div>
        </div>
      </div>

      {/* Main Order Form */}
      <form onSubmit={handleCreateOrder} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Merchant ID
          </label>
          <input
            type="text"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 font-mono"
            placeholder="mch_test_01"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Customer ID
          </label>
          <input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 font-mono"
            placeholder="cust_01"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Amount (Rupees ₹)
          </label>
          <input
            type="number"
            value={amountRupees}
            onChange={(e) => setAmountRupees(Number(e.target.value))}
            min="1"
            step="1"
            required
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 font-mono"
            placeholder="7500"
          />
          <p className="text-[11px] text-cyan-400/90 font-mono">
            = {amountPaise.toLocaleString()} smallest currency units (paise)
          </p>
        </div>

        {/* Preset Amount Buttons */}
        <div className="md:col-span-3 flex flex-wrap items-center gap-3 pt-2">
          <span className="text-xs text-slate-400 font-medium">Quick Presets:</span>
          {[
            { label: '₹1,500', val: 1500 },
            { label: '₹7,500', val: 7500 },
            { label: '₹25,000', val: 25000 }
          ].map((preset) => (
            <button
              key={preset.val}
              type="button"
              onClick={() => setAmountRupees(preset.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                amountRupees === preset.val
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              {preset.label}
            </button>
          ))}

          <div className="ml-auto">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Razorpay Order...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>1. Create Test Mode Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Error Message Display */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center space-x-3 font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Order Created Output Box */}
      {orderResult && (
        <div className="rounded-2xl p-6 bg-slate-900/90 border border-cyan-800/60 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-slate-100 text-sm">
                Razorpay Test Order Created Successfully
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-amber-950 text-amber-300 border border-amber-800/80">
              Internal Status: {orderResult.order.status} (Unpaid)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="block text-slate-500 text-[10px] uppercase">Internal Order ID</span>
              <span className="text-cyan-300 font-semibold">{orderResult.order.id}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="block text-slate-500 text-[10px] uppercase">Razorpay Order ID</span>
              <span className="text-cyan-300 font-semibold">{orderResult.checkout.razorpayOrderId}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="block text-slate-500 text-[10px] uppercase">Amount (Paise)</span>
              <span className="text-emerald-400 font-semibold">{orderResult.checkout.amount.toLocaleString()} paise</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="block text-slate-500 text-[10px] uppercase">Currency</span>
              <span className="text-slate-300 font-semibold">{orderResult.checkout.currency}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Click below to launch official Razorpay Test Checkout modal:
            </p>
            <button
              onClick={handleOpenCheckout}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>2. Open Razorpay Test Checkout</span>
            </button>
          </div>
        </div>
      )}

      {/* Checkout Callback Display */}
      {checkoutCallback && (
        <div className="rounded-2xl p-5 bg-cyan-950/40 border border-cyan-700/60 space-y-3 font-mono text-xs">
          <div className="flex items-center space-x-2 text-cyan-300 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Browser Checkout Modal Callback Received</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div>Payment ID: <span className="text-cyan-200">{checkoutCallback.paymentId || 'N/A'}</span></div>
            <div>Razorpay Order ID: <span className="text-cyan-200">{checkoutCallback.orderId || 'N/A'}</span></div>
          </div>
          <p className="text-[11px] text-cyan-400/90 leading-relaxed pt-1 border-t border-cyan-800/40">
            {checkoutCallback.note}
          </p>
        </div>
      )}

      {/* Boundary Warning Banner */}
      <div className="rounded-2xl p-4 bg-slate-900/60 border border-slate-800/80 flex items-start space-x-3 text-xs text-slate-400">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-300 block">Phase 2 Boundaries & Security Safety</span>
          <p>
            Creating a Razorpay order or receiving a browser checkout callback is <strong>not</strong> payment success. 
            Secret keys (<code className="text-cyan-400 bg-slate-950 px-1 py-0.5 rounded">RAZORPAY_KEY_SECRET</code>) remain 100% server-side. 
            Trusted payment state, webhook signature verification, and revenue recovery processing are strictly part of <strong>Phase 3</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
