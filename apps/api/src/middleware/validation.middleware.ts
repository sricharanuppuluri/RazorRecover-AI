import { Request, Response, NextFunction } from 'express';

const VALID_CURRENCIES = ['INR', 'USD', 'EUR'];
const VALID_ORDER_STATUSES = ['CREATED', 'ATTEMPTED', 'PAID', 'ABANDONED', 'EXPIRED'];
const VALID_PAYMENT_STATUSES = ['CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'];
const VALID_CASE_TYPES = ['PAYMENT_FAILURE', 'CHECKOUT_ABANDONMENT', 'SUBSCRIPTION_FAILURE', 'DEGRADATION'];
const VALID_CASE_STATUSES = [
  'NEW', 'DETECTED', 'DIAGNOSING', 'SCORED', 'AI_RECOMMENDED', 'POLICY_CHECK',
  'HUMAN_REVIEW', 'ACTION_PENDING', 'ACTION_SENT', 'WAITING_FOR_OUTCOME',
  'RECOVERED', 'FAILED', 'STOPPED'
];

export function validateMerchantInput(req: Request, res: Response, next: NextFunction) {
  const { id, name, currency } = req.body;

  if (!id || typeof id !== 'string' || id.trim() === '') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid merchant id', code: 'INVALID_INPUT' } });
  }
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid merchant name', code: 'INVALID_INPUT' } });
  }
  if (currency && !VALID_CURRENCIES.includes(currency)) {
    return res.status(400).json({ status: 'error', error: { message: `Invalid currency. Allowed: ${VALID_CURRENCIES.join(', ')}`, code: 'INVALID_INPUT' } });
  }

  next();
}

export function validateCustomerInput(req: Request, res: Response, next: NextFunction) {
  const { id, merchant_id, external_customer_id, total_success_value, total_failed_value } = req.body;

  if (!id || typeof id !== 'string' || id.trim() === '') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid customer id', code: 'INVALID_INPUT' } });
  }
  if (!merchant_id || typeof merchant_id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid merchant_id', code: 'INVALID_INPUT' } });
  }
  if (!external_customer_id || typeof external_customer_id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid external_customer_id', code: 'INVALID_INPUT' } });
  }
  if (total_success_value !== undefined && (typeof total_success_value !== 'number' || total_success_value < 0 || !Number.isInteger(total_success_value))) {
    return res.status(400).json({ status: 'error', error: { message: 'total_success_value must be a non-negative integer (paise)', code: 'INVALID_INPUT' } });
  }
  if (total_failed_value !== undefined && (typeof total_failed_value !== 'number' || total_failed_value < 0 || !Number.isInteger(total_failed_value))) {
    return res.status(400).json({ status: 'error', error: { message: 'total_failed_value must be a non-negative integer (paise)', code: 'INVALID_INPUT' } });
  }

  next();
}

export function validateOrderInput(req: Request, res: Response, next: NextFunction) {
  const { id, merchant_id, customer_id, amount, status, currency } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid order id', code: 'INVALID_INPUT' } });
  }
  if (!merchant_id || typeof merchant_id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid merchant_id', code: 'INVALID_INPUT' } });
  }
  if (!customer_id || typeof customer_id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid customer_id', code: 'INVALID_INPUT' } });
  }
  if (typeof amount !== 'number' || amount < 0 || !Number.isInteger(amount)) {
    return res.status(400).json({ status: 'error', error: { message: 'amount must be a non-negative integer in smallest currency units (paise)', code: 'INVALID_INPUT' } });
  }
  if (currency && !VALID_CURRENCIES.includes(currency)) {
    return res.status(400).json({ status: 'error', error: { message: `Invalid currency. Allowed: ${VALID_CURRENCIES.join(', ')}`, code: 'INVALID_INPUT' } });
  }
  if (status && !VALID_ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ status: 'error', error: { message: `Invalid order status. Allowed: ${VALID_ORDER_STATUSES.join(', ')}`, code: 'INVALID_INPUT' } });
  }

  next();
}

export function validatePaymentInput(req: Request, res: Response, next: NextFunction) {
  const { id, merchant_id, customer_id, amount, status, currency } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid payment id', code: 'INVALID_INPUT' } });
  }
  if (!merchant_id || typeof merchant_id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid merchant_id', code: 'INVALID_INPUT' } });
  }
  if (!customer_id || typeof customer_id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid customer_id', code: 'INVALID_INPUT' } });
  }
  if (typeof amount !== 'number' || amount < 0 || !Number.isInteger(amount)) {
    return res.status(400).json({ status: 'error', error: { message: 'amount must be a non-negative integer in smallest currency units (paise)', code: 'INVALID_INPUT' } });
  }
  if (currency && !VALID_CURRENCIES.includes(currency)) {
    return res.status(400).json({ status: 'error', error: { message: `Invalid currency. Allowed: ${VALID_CURRENCIES.join(', ')}`, code: 'INVALID_INPUT' } });
  }
  if (status && !VALID_PAYMENT_STATUSES.includes(status)) {
    return res.status(400).json({ status: 'error', error: { message: `Invalid payment status. Allowed: ${VALID_PAYMENT_STATUSES.join(', ')}`, code: 'INVALID_INPUT' } });
  }

  next();
}

export function validateRecoveryCaseInput(req: Request, res: Response, next: NextFunction) {
  const { id, merchant_id, order_id, case_type, amount_at_risk, status } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid recovery case id', code: 'INVALID_INPUT' } });
  }
  if (!merchant_id || typeof merchant_id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid merchant_id', code: 'INVALID_INPUT' } });
  }
  if (!order_id || typeof order_id !== 'string') {
    return res.status(400).json({ status: 'error', error: { message: 'Missing or invalid order_id', code: 'INVALID_INPUT' } });
  }
  if (!case_type || !VALID_CASE_TYPES.includes(case_type)) {
    return res.status(400).json({ status: 'error', error: { message: `Invalid case_type. Allowed: ${VALID_CASE_TYPES.join(', ')}`, code: 'INVALID_INPUT' } });
  }
  if (typeof amount_at_risk !== 'number' || amount_at_risk < 0 || !Number.isInteger(amount_at_risk)) {
    return res.status(400).json({ status: 'error', error: { message: 'amount_at_risk must be a non-negative integer in smallest currency units (paise)', code: 'INVALID_INPUT' } });
  }
  if (status && !VALID_CASE_STATUSES.includes(status)) {
    return res.status(400).json({ status: 'error', error: { message: `Invalid recovery case status. Allowed: ${VALID_CASE_STATUSES.join(', ')}`, code: 'INVALID_INPUT' } });
  }

  next();
}
