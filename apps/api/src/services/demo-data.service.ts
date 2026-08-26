import { MerchantRepository } from '../repositories/merchant.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { AIDecisionRepository } from '../repositories/ai-decision.repository';
import { PolicyDecisionRepository } from '../repositories/policy-decision.repository';
import { RecoveryActionRepository } from '../repositories/recovery-action.repository';
import { AuditEventRepository } from '../repositories/audit-event.repository';
import { MerchantSettingsService } from './merchant-settings.service';
import { FailureCategory, AllowedAction, CaseStatus } from '@razorrecover/shared-types';

export class DemoDataService {
  private static isSeeded = false;

  public static async seedAll(forceReset = false): Promise<{
    merchantsCount: number;
    customersCount: number;
    ordersCount: number;
    paymentsCount: number;
    casesCount: number;
    aiDecisionsCount: number;
    policyDecisionsCount: number;
    actionsCount: number;
    auditEventsCount: number;
  }> {
    if (this.isSeeded && !forceReset) {
      const caseRepo = new RecoveryCaseRepository();
      const { total } = await caseRepo.findAll({ limit: 1 });
      if (total >= 20) {
        return this.getCounts();
      }
    }

    if (forceReset) {
      await this.resetAll();
    }

    const merchantRepo = new MerchantRepository();
    const customerRepo = new CustomerRepository();
    const orderRepo = new OrderRepository();
    const paymentRepo = new PaymentRepository();
    const caseRepo = new RecoveryCaseRepository();
    const aiRepo = new AIDecisionRepository();
    const policyRepo = new PolicyDecisionRepository();
    const actionRepo = new RecoveryActionRepository();
    const auditRepo = new AuditEventRepository();
    const settingsService = new MerchantSettingsService();

    // 1. MERCHANTS
    const merchantsData = [
      {
        id: 'mch_test_01',
        name: 'RazorRecover Demo Merchant',
        currency: 'INR',
        test_mode: true,
        policy_profile_id: 'pol_default',
        high_value_threshold: 10000000 // ₹1,00,000 in paise
      },
      {
        id: 'merchant_demo_001',
        name: 'RazorCart Demo',
        currency: 'INR',
        test_mode: true,
        policy_profile_id: 'pol_std_01',
        high_value_threshold: 10000000
      },
      {
        id: 'merchant_demo_002',
        name: 'NovaCommerce Demo',
        currency: 'INR',
        test_mode: true,
        policy_profile_id: 'pol_std_02',
        high_value_threshold: 5000000 // ₹50,000 in paise
      },
      {
        id: 'merchant_demo_003',
        name: 'Acme Digital Demo',
        currency: 'INR',
        test_mode: true,
        policy_profile_id: 'pol_std_03',
        high_value_threshold: 20000000 // ₹2,00,000 in paise
      }
    ];

    for (const m of merchantsData) {
      await merchantRepo.create(m);
      await settingsService.updateSettings(m.id, {
        highValueThreshold: m.high_value_threshold,
        minAIConfidence: 0.70,
        maxRetryAttempts: 3,
        maxNotifications: 2,
        contactOptInRequired: true
      });
    }

    // 2. CUSTOMERS (Synthetic Names, Example Domain Emails, Hashed Phone, No Real PII)
    const customersData = [
      { id: 'cust_demo_001', merchant_id: 'mch_test_01', ext_id: 'ext_cust_101', name: 'Aarav Sharma', email: 'aarav.sharma@example.com', phone: '+919876543210', optIn: true, segment: 'HIGH_VALUE' },
      { id: 'cust_demo_002', merchant_id: 'mch_test_01', ext_id: 'ext_cust_102', name: 'Priya Patel', email: 'priya.patel@example.com', phone: '+919876543211', optIn: true, segment: 'REPEAT_BUYER' },
      { id: 'cust_demo_003', merchant_id: 'mch_test_01', ext_id: 'ext_cust_103', name: 'Rohan Mehta', email: 'rohan.mehta@example.com', phone: '+919876543212', optIn: true, segment: 'NEW_CUSTOMER' },
      { id: 'cust_demo_004', merchant_id: 'mch_test_01', ext_id: 'ext_cust_104', name: 'Ananya Iyer', email: 'ananya.iyer@example.com', phone: '+919876543213', optIn: false, segment: 'CHURN_RISK' }, // Opted out
      { id: 'cust_demo_005', merchant_id: 'mch_test_01', ext_id: 'ext_cust_105', name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '+919876543214', optIn: true, segment: 'HIGH_VALUE' },
      { id: 'cust_demo_006', merchant_id: 'mch_test_01', ext_id: 'ext_cust_106', name: 'Neha Gupta', email: 'neha.gupta@example.com', phone: '+919876543215', optIn: true, segment: 'REGULAR' },
      { id: 'cust_demo_007', merchant_id: 'mch_test_01', ext_id: 'ext_cust_107', name: 'Kavya Nair', email: 'kavya.nair@example.com', phone: '+919876543216', optIn: true, segment: 'REPEAT_BUYER' },
      { id: 'cust_demo_008', merchant_id: 'mch_test_01', ext_id: 'ext_cust_108', name: 'Aditya Verma', email: 'aditya.verma@example.com', phone: '+919876543217', optIn: false, segment: 'NEW_CUSTOMER' }, // Opted out
      { id: 'cust_demo_009', merchant_id: 'merchant_demo_001', ext_id: 'ext_cust_201', name: 'Siddharth Rao', email: 'siddharth.rao@example.com', phone: '+919876543218', optIn: true, segment: 'HIGH_VALUE' },
      { id: 'cust_demo_010', merchant_id: 'merchant_demo_001', ext_id: 'ext_cust_202', name: 'Tanvi Joshi', email: 'tanvi.joshi@example.com', phone: '+919876543219', optIn: true, segment: 'REGULAR' },
      { id: 'cust_demo_011', merchant_id: 'merchant_demo_002', ext_id: 'ext_cust_301', name: 'Rahul Deshmukh', email: 'rahul.deshmukh@example.com', phone: '+919876543220', optIn: true, segment: 'REPEAT_BUYER' },
      { id: 'cust_demo_012', merchant_id: 'merchant_demo_002', ext_id: 'ext_cust_302', name: 'Meera Sen', email: 'meera.sen@example.com', phone: '+919876543221', optIn: true, segment: 'CHURN_RISK' },
      { id: 'cust_demo_013', merchant_id: 'merchant_demo_003', ext_id: 'ext_cust_401', name: 'Kabir Bhatia', email: 'kabir.bhatia@example.com', phone: '+919876543222', optIn: true, segment: 'HIGH_VALUE' },
      { id: 'cust_demo_014', merchant_id: 'merchant_demo_003', ext_id: 'ext_cust_402', name: 'Ishaan Malhotra', email: 'ishaan.malhotra@example.com', phone: '+919876543223', optIn: true, segment: 'REGULAR' },
      { id: 'cust_demo_015', merchant_id: 'mch_test_01', ext_id: 'ext_cust_109', name: 'Riya Kapoor', email: 'riya.kapoor@example.com', phone: '+919876543224', optIn: true, segment: 'NEW_CUSTOMER' }
    ];

    for (const c of customersData) {
      await customerRepo.create({
        id: c.id,
        merchant_id: c.merchant_id,
        external_customer_id: c.ext_id,
        email_hash: `hash_${c.email}`,
        phone_hash: `hash_${c.phone}`,
        contact_opt_in: c.optIn,
        risk_flags: c.segment === 'CHURN_RISK' ? ['CHURN_RISK'] : c.segment === 'REPEAT_BUYER' ? ['REPEAT_CUSTOMER'] : []
      });
    }

    // 3. RECOVERY CASE DEFINITIONS (Rich Variety & Exact Semantic Consistency)
    const now = Date.now();
    const hours = (h: number) => new Date(now - h * 3600 * 1000).toISOString();
    const futureHours = (h: number) => new Date(now + h * 3600 * 1000).toISOString();

    const casesSpecs: Array<{
      caseId: string;
      merchantId: string;
      orderId: string;
      paymentId: string;
      customerId: string;
      amountPaise: number; // Integer paise
      status: CaseStatus;
      diagnosis: FailureCategory;
      diagConfidence: number;
      score: number;
      expectedValue: number;
      action: AllowedAction;
      actionConfidence: number;
      policyDecision: 'APPROVED' | 'DENIED' | 'HUMAN_REQUIRED';
      violatedRules: string[];
      method: string;
      bank: string;
      startedHoursAgo: number;
      recoveredAmount?: number;
      closeReason?: string;
      retryCount: number;
      actionStatus?: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
      auditEvents: string[];
    }> = [
      // RECOVERED CASES (8 cases)
      {
        caseId: 'rc_demo_rec_01',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_101',
        paymentId: 'pay_demo_101',
        customerId: 'cust_demo_001',
        amountPaise: 750000, // ₹7,500
        status: 'RECOVERED',
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagConfidence: 0.92,
        score: 0.85,
        expectedValue: 637500,
        action: 'WAIT_AND_RETRY',
        actionConfidence: 0.88,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'upi',
        bank: 'HDFC',
        startedHoursAgo: 18,
        recoveredAmount: 750000,
        closeReason: 'PAYMENT_CAPTURED',
        retryCount: 1,
        actionStatus: 'SUCCEEDED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_SUCCEEDED', 'RECOVERY_CASE_RECOVERED']
      },
      {
        caseId: 'rc_demo_rec_02',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_102',
        paymentId: 'pay_demo_102',
        customerId: 'cust_demo_002',
        amountPaise: 299900, // ₹2,999
        status: 'RECOVERED',
        diagnosis: 'CUSTOMER_AUTHENTICATION_ISSUE',
        diagConfidence: 0.89,
        score: 0.80,
        expectedValue: 239920,
        action: 'SEND_RECOVERY_LINK',
        actionConfidence: 0.86,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'card',
        bank: 'ICICI',
        startedHoursAgo: 14,
        recoveredAmount: 299900,
        closeReason: 'PAYMENT_CAPTURED',
        retryCount: 0,
        actionStatus: 'SUCCEEDED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_SUCCEEDED', 'RECOVERY_CASE_RECOVERED']
      },
      {
        caseId: 'rc_demo_rec_03',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_103',
        paymentId: 'pay_demo_103',
        customerId: 'cust_demo_003',
        amountPaise: 1250000, // ₹12,500
        status: 'RECOVERED',
        diagnosis: 'INSUFFICIENT_FUNDS',
        diagConfidence: 0.84,
        score: 0.72,
        expectedValue: 900000,
        action: 'OFFER_ALTERNATE_PAYMENT',
        actionConfidence: 0.81,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'upi',
        bank: 'SBI',
        startedHoursAgo: 10,
        recoveredAmount: 1250000,
        closeReason: 'PAYMENT_CAPTURED',
        retryCount: 1,
        actionStatus: 'SUCCEEDED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_SUCCEEDED', 'RECOVERY_CASE_RECOVERED']
      },
      {
        caseId: 'rc_demo_rec_04',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_104',
        paymentId: 'pay_demo_104',
        customerId: 'cust_demo_005',
        amountPaise: 3500000, // ₹35,000
        status: 'RECOVERED',
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagConfidence: 0.95,
        score: 0.90,
        expectedValue: 3150000,
        action: 'WAIT_AND_RETRY',
        actionConfidence: 0.92,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'netbanking',
        bank: 'AXIS',
        startedHoursAgo: 8,
        recoveredAmount: 3500000,
        closeReason: 'PAYMENT_CAPTURED',
        retryCount: 1,
        actionStatus: 'SUCCEEDED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_SUCCEEDED', 'RECOVERY_CASE_RECOVERED']
      },
      {
        caseId: 'rc_demo_rec_05',
        merchantId: 'merchant_demo_001',
        orderId: 'ord_demo_201',
        paymentId: 'pay_demo_201',
        customerId: 'cust_demo_009',
        amountPaise: 7500000, // ₹75,000
        status: 'RECOVERED',
        diagnosis: 'CUSTOMER_AUTHENTICATION_ISSUE',
        diagConfidence: 0.91,
        score: 0.86,
        expectedValue: 6450000,
        action: 'SEND_RECOVERY_LINK',
        actionConfidence: 0.89,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'card',
        bank: 'HDFC',
        startedHoursAgo: 20,
        recoveredAmount: 7500000,
        closeReason: 'PAYMENT_CAPTURED',
        retryCount: 0,
        actionStatus: 'SUCCEEDED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_SUCCEEDED', 'RECOVERY_CASE_RECOVERED']
      },
      {
        caseId: 'rc_demo_rec_06',
        merchantId: 'merchant_demo_002',
        orderId: 'ord_demo_301',
        paymentId: 'pay_demo_301',
        customerId: 'cust_demo_011',
        amountPaise: 149900, // ₹1,499
        status: 'RECOVERED',
        diagnosis: 'CHECKOUT_ABANDONMENT',
        diagConfidence: 0.87,
        score: 0.78,
        expectedValue: 116922,
        action: 'SEND_REMINDER',
        actionConfidence: 0.84,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'upi',
        bank: 'PHONEPE',
        startedHoursAgo: 16,
        recoveredAmount: 149900,
        closeReason: 'PAYMENT_CAPTURED',
        retryCount: 0,
        actionStatus: 'SUCCEEDED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_SUCCEEDED', 'RECOVERY_CASE_RECOVERED']
      },
      {
        caseId: 'rc_demo_rec_07',
        merchantId: 'merchant_demo_003',
        orderId: 'ord_demo_401',
        paymentId: 'pay_demo_401',
        customerId: 'cust_demo_013',
        amountPaise: 1800000, // ₹18,000
        status: 'RECOVERED',
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagConfidence: 0.94,
        score: 0.88,
        expectedValue: 1584000,
        action: 'WAIT_AND_RETRY',
        actionConfidence: 0.91,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'upi',
        bank: 'KOTAK',
        startedHoursAgo: 12,
        recoveredAmount: 1800000,
        closeReason: 'PAYMENT_CAPTURED',
        retryCount: 1,
        actionStatus: 'SUCCEEDED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_SUCCEEDED', 'RECOVERY_CASE_RECOVERED']
      },
      {
        caseId: 'rc_demo_rec_08',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_105',
        paymentId: 'pay_demo_105',
        customerId: 'cust_demo_006',
        amountPaise: 79900, // ₹799
        status: 'RECOVERED',
        diagnosis: 'CUSTOMER_AUTHENTICATION_ISSUE',
        diagConfidence: 0.88,
        score: 0.82,
        expectedValue: 65518,
        action: 'SEND_RECOVERY_LINK',
        actionConfidence: 0.85,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'wallet',
        bank: 'PAYTM',
        startedHoursAgo: 6,
        recoveredAmount: 79900,
        closeReason: 'PAYMENT_CAPTURED',
        retryCount: 0,
        actionStatus: 'SUCCEEDED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_SUCCEEDED', 'RECOVERY_CASE_RECOVERED']
      },

      // HUMAN REVIEW QUEUE (5 cases - as required in spec items 5, 7 & 12)
      {
        caseId: 'rc_demo_hr_01',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_hr_101',
        paymentId: 'pay_demo_hr_101',
        customerId: 'cust_demo_001',
        amountPaise: 12500000, // ₹1,25,000 (High Value > ₹1,00,000)
        status: 'HUMAN_REVIEW',
        diagnosis: 'UNKNOWN_OR_AMBIGUOUS',
        diagConfidence: 0.55,
        score: 0.65,
        expectedValue: 8125000,
        action: 'ESCALATE_HUMAN',
        actionConfidence: 0.70,
        policyDecision: 'HUMAN_REQUIRED',
        violatedRules: ['HIGH_VALUE_REQUIRES_REVIEW'],
        method: 'netbanking',
        bank: 'HDFC',
        startedHoursAgo: 1,
        retryCount: 0,
        actionStatus: 'PENDING',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'HUMAN_REVIEW_REQUESTED']
      },
      {
        caseId: 'rc_demo_hr_02',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_hr_102',
        paymentId: 'pay_demo_hr_102',
        customerId: 'cust_demo_006',
        amountPaise: 3500000, // ₹35,000
        status: 'HUMAN_REVIEW',
        diagnosis: 'INSUFFICIENT_FUNDS',
        diagConfidence: 0.48, // Low AI confidence < 0.70 threshold
        score: 0.52,
        expectedValue: 1820000,
        action: 'ESCALATE_HUMAN',
        actionConfidence: 0.52,
        policyDecision: 'HUMAN_REQUIRED',
        violatedRules: ['LOW_AI_CONFIDENCE'],
        method: 'upi',
        bank: 'SBI',
        startedHoursAgo: 2,
        retryCount: 0,
        actionStatus: 'PENDING',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'HUMAN_REVIEW_REQUESTED']
      },
      {
        caseId: 'rc_demo_hr_03',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_hr_103',
        paymentId: 'pay_demo_hr_103',
        customerId: 'cust_demo_007',
        amountPaise: 7500000, // ₹75,000
        status: 'HUMAN_REVIEW',
        diagnosis: 'UNKNOWN_OR_AMBIGUOUS',
        diagConfidence: 0.42,
        score: 0.45,
        expectedValue: 3375000,
        action: 'ESCALATE_HUMAN',
        actionConfidence: 0.45,
        policyDecision: 'HUMAN_REQUIRED',
        violatedRules: ['LOW_RECOVERY_PROBABILITY', 'LOW_AI_CONFIDENCE'],
        method: 'card',
        bank: 'ICICI',
        startedHoursAgo: 3,
        retryCount: 0,
        actionStatus: 'PENDING',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'HUMAN_REVIEW_REQUESTED']
      },
      {
        caseId: 'rc_demo_hr_04',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_hr_104',
        paymentId: 'pay_demo_hr_104',
        customerId: 'cust_demo_005',
        amountPaise: 25000000, // ₹2,50,000 (Very High Value)
        status: 'HUMAN_REVIEW',
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagConfidence: 0.90,
        score: 0.88,
        expectedValue: 22000000,
        action: 'ESCALATE_HUMAN',
        actionConfidence: 0.85,
        policyDecision: 'HUMAN_REQUIRED',
        violatedRules: ['HIGH_VALUE_REQUIRES_REVIEW'],
        method: 'netbanking',
        bank: 'AXIS',
        startedHoursAgo: 4,
        retryCount: 0,
        actionStatus: 'PENDING',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'HUMAN_REVIEW_REQUESTED']
      },
      {
        caseId: 'rc_demo_hr_05',
        merchantId: 'merchant_demo_001',
        orderId: 'ord_demo_hr_201',
        paymentId: 'pay_demo_hr_201',
        customerId: 'cust_demo_010',
        amountPaise: 1800000, // ₹18,000
        status: 'HUMAN_REVIEW',
        diagnosis: 'REPEATED_FAILURE',
        diagConfidence: 0.68,
        score: 0.58,
        expectedValue: 1044000,
        action: 'ESCALATE_HUMAN',
        actionConfidence: 0.65,
        policyDecision: 'HUMAN_REQUIRED',
        violatedRules: ['RETRY_LIMIT_EXCEEDED'],
        method: 'upi',
        bank: 'HDFC',
        startedHoursAgo: 5,
        retryCount: 2,
        actionStatus: 'PENDING',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'HUMAN_REVIEW_REQUESTED']
      },

      // WAITING_FOR_OUTCOME & ACTION_PENDING & DIAGNOSING (ACTIVE CASES)
      {
        caseId: 'rc_demo_act_01',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_106',
        paymentId: 'pay_demo_106',
        customerId: 'cust_demo_001',
        amountPaise: 750000, // ₹7,500
        status: 'WAITING_FOR_OUTCOME',
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagConfidence: 0.92,
        score: 0.85,
        expectedValue: 637500,
        action: 'WAIT_AND_RETRY',
        actionConfidence: 0.88,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'upi',
        bank: 'HDFC',
        startedHoursAgo: 2,
        retryCount: 1,
        actionStatus: 'SUCCEEDED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_SUCCEEDED']
      },
      {
        caseId: 'rc_demo_act_02',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_107',
        paymentId: 'pay_demo_107',
        customerId: 'cust_demo_002',
        amountPaise: 1800000, // ₹18,000
        status: 'ACTION_PENDING',
        diagnosis: 'CUSTOMER_AUTHENTICATION_ISSUE',
        diagConfidence: 0.88,
        score: 0.79,
        expectedValue: 1422000,
        action: 'SEND_RECOVERY_LINK',
        actionConfidence: 0.85,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'card',
        bank: 'ICICI',
        startedHoursAgo: 1,
        retryCount: 0,
        actionStatus: 'PENDING',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED']
      },
      {
        caseId: 'rc_demo_act_03',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_108',
        paymentId: 'pay_demo_108',
        customerId: 'cust_demo_003',
        amountPaise: 150000, // ₹1,500
        status: 'ACTION_PENDING',
        diagnosis: 'CHECKOUT_ABANDONMENT',
        diagConfidence: 0.88,
        score: 0.70,
        expectedValue: 105000,
        action: 'SEND_REMINDER',
        actionConfidence: 0.82,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'upi',
        bank: 'PHONEPE',
        startedHoursAgo: 0.5,
        retryCount: 0,
        actionStatus: 'PENDING',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED']
      },
      {
        caseId: 'rc_demo_act_04',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_109',
        paymentId: 'pay_demo_109',
        customerId: 'cust_demo_006',
        amountPaise: 420000, // ₹4,200
        status: 'WAITING_FOR_OUTCOME',
        diagnosis: 'INSUFFICIENT_FUNDS',
        diagConfidence: 0.82,
        score: 0.60,
        expectedValue: 252000,
        action: 'OFFER_ALTERNATE_PAYMENT',
        actionConfidence: 0.79,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'upi',
        bank: 'SBI',
        startedHoursAgo: 3,
        retryCount: 0,
        actionStatus: 'SUCCEEDED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_SUCCEEDED']
      },
      {
        caseId: 'rc_demo_act_05',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_110',
        paymentId: 'pay_demo_110',
        customerId: 'cust_demo_015',
        amountPaise: 299900, // ₹2,999
        status: 'DIAGNOSING',
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagConfidence: 0.75,
        score: 0.72,
        expectedValue: 215928,
        action: 'WAIT_AND_RETRY',
        actionConfidence: 0.75,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'upi',
        bank: 'HDFC',
        startedHoursAgo: 0.2,
        retryCount: 0,
        actionStatus: 'PENDING',
        auditEvents: ['CASE_CREATED']
      },
      {
        caseId: 'rc_demo_act_06',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_111',
        paymentId: 'pay_demo_111',
        customerId: 'cust_demo_007',
        amountPaise: 1250000, // ₹12,500
        status: 'SCORED',
        diagnosis: 'CUSTOMER_AUTHENTICATION_ISSUE',
        diagConfidence: 0.86,
        score: 0.81,
        expectedValue: 1012500,
        action: 'SEND_RECOVERY_LINK',
        actionConfidence: 0.83,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'card',
        bank: 'AXIS',
        startedHoursAgo: 0.4,
        retryCount: 0,
        actionStatus: 'PENDING',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED']
      },
      {
        caseId: 'rc_demo_act_07',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_112',
        paymentId: 'pay_demo_112',
        customerId: 'cust_demo_005',
        amountPaise: 750000, // ₹7,500
        status: 'NEW',
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagConfidence: 0.70,
        score: 0.75,
        expectedValue: 562500,
        action: 'WAIT_AND_RETRY',
        actionConfidence: 0.70,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'upi',
        bank: 'SBI',
        startedHoursAgo: 0.1,
        retryCount: 0,
        actionStatus: 'PENDING',
        auditEvents: ['CASE_CREATED']
      },

      // STOPPED & FAILED CASES (POLICY DENIALS & EXPIRATIONS)
      {
        caseId: 'rc_demo_stp_01',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_113',
        paymentId: 'pay_demo_113',
        customerId: 'cust_demo_004', // Customer opted out!
        amountPaise: 180000, // ₹1,800
        status: 'STOPPED',
        diagnosis: 'CHECKOUT_ABANDONMENT',
        diagConfidence: 0.95,
        score: 0.12,
        expectedValue: 21600,
        action: 'STOP',
        actionConfidence: 0.96,
        policyDecision: 'DENIED',
        violatedRules: ['CUSTOMER_CONTACT_NOT_ALLOWED'],
        method: 'upi',
        bank: 'HDFC',
        startedHoursAgo: 24,
        closeReason: 'CUSTOMER_CONTACT_NOT_ALLOWED',
        retryCount: 0,
        actionStatus: 'CANCELLED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'RECOVERY_CASE_STOPPED']
      },
      {
        caseId: 'rc_demo_stp_02',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_114',
        paymentId: 'pay_demo_114',
        customerId: 'cust_demo_002',
        amountPaise: 299900, // ₹2,999
        status: 'STOPPED',
        diagnosis: 'REPEATED_FAILURE',
        diagConfidence: 0.98,
        score: 0.10,
        expectedValue: 29990,
        action: 'STOP',
        actionConfidence: 0.98,
        policyDecision: 'DENIED',
        violatedRules: ['RETRY_LIMIT_EXCEEDED'],
        method: 'card',
        bank: 'ICICI',
        startedHoursAgo: 30,
        closeReason: 'RETRY_LIMIT_EXCEEDED',
        retryCount: 3,
        actionStatus: 'CANCELLED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'RECOVERY_CASE_STOPPED']
      },
      {
        caseId: 'rc_demo_stp_03',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_115',
        paymentId: 'pay_demo_115',
        customerId: 'cust_demo_008', // Customer opted out!
        amountPaise: 750000, // ₹7,500
        status: 'STOPPED',
        diagnosis: 'INSUFFICIENT_FUNDS',
        diagConfidence: 0.90,
        score: 0.15,
        expectedValue: 112500,
        action: 'STOP',
        actionConfidence: 0.95,
        policyDecision: 'DENIED',
        violatedRules: ['CUSTOMER_CONTACT_NOT_ALLOWED'],
        method: 'upi',
        bank: 'SBI',
        startedHoursAgo: 12,
        closeReason: 'CUSTOMER_CONTACT_NOT_ALLOWED',
        retryCount: 0,
        actionStatus: 'CANCELLED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'RECOVERY_CASE_STOPPED']
      },
      {
        caseId: 'rc_demo_stp_04',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_116',
        paymentId: 'pay_demo_116',
        customerId: 'cust_demo_003',
        amountPaise: 450000, // ₹4,500
        status: 'STOPPED',
        diagnosis: 'ALREADY_CAPTURED',
        diagConfidence: 0.99,
        score: 0.00,
        expectedValue: 0,
        action: 'STOP',
        actionConfidence: 0.99,
        policyDecision: 'DENIED',
        violatedRules: ['PAYMENT_ALREADY_CAPTURED'],
        method: 'upi',
        bank: 'HDFC',
        startedHoursAgo: 16,
        closeReason: 'PAYMENT_ALREADY_CAPTURED',
        retryCount: 0,
        actionStatus: 'CANCELLED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'RECOVERY_CASE_STOPPED']
      },
      {
        caseId: 'rc_demo_fail_01',
        merchantId: 'mch_test_01',
        orderId: 'ord_demo_117',
        paymentId: 'pay_demo_117',
        customerId: 'cust_demo_006',
        amountPaise: 149900, // ₹1,499
        status: 'FAILED',
        diagnosis: 'CHECKOUT_ABANDONMENT',
        diagConfidence: 0.85,
        score: 0.30,
        expectedValue: 44970,
        action: 'SEND_REMINDER',
        actionConfidence: 0.80,
        policyDecision: 'APPROVED',
        violatedRules: [],
        method: 'wallet',
        bank: 'PAYTM',
        startedHoursAgo: 36,
        closeReason: 'RECOVERY_WINDOW_EXPIRED',
        retryCount: 2,
        actionStatus: 'FAILED',
        auditEvents: ['CASE_CREATED', 'AI_DECISION_GENERATED', 'POLICY_EVALUATED', 'ACTION_REQUESTED', 'ACTION_FAILED']
      }
    ];

    // Build and populate orders, payments, recovery cases, AI decisions, policy decisions, recovery actions, audit events
    for (const spec of casesSpecs) {
      // Order
      const rzpOrderId = `order_${spec.orderId}`;
      await orderRepo.create({
        id: spec.orderId,
        merchant_id: spec.merchantId,
        razorpay_order_id: rzpOrderId,
        customer_id: spec.customerId,
        amount: spec.amountPaise,
        currency: 'INR',
        status: spec.status === 'RECOVERED' ? 'PAID' : 'ATTEMPTED',
        product_category: spec.amountPaise >= 10000000 ? 'Electronics' : 'Apparel',
        created_at: hours(spec.startedHoursAgo)
      });

      // Payment
      const rzpPaymentId = `pay_${spec.paymentId}`;
      const payStatus = spec.status === 'RECOVERED' ? 'CAPTURED' : 'FAILED';
      await paymentRepo.create({
        id: spec.paymentId,
        merchant_id: spec.merchantId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_order_id: rzpOrderId,
        customer_id: spec.customerId,
        amount: spec.amountPaise,
        currency: 'INR',
        method: spec.method,
        bank: spec.bank,
        status: payStatus,
        error_code: payStatus === 'FAILED' ? 'BAD_REQUEST_ERROR' : undefined,
        error_description: payStatus === 'FAILED' ? `Payment failed on ${spec.bank} via ${spec.method}` : undefined,
        error_reason: payStatus === 'FAILED' ? spec.diagnosis.toLowerCase() : undefined,
        failure_count: spec.retryCount + 1,
        created_at: hours(spec.startedHoursAgo),
        captured_at: payStatus === 'CAPTURED' ? hours(spec.startedHoursAgo - 2) : undefined,
        recovery_case_id: spec.caseId
      });

      // Recovery Case
      await caseRepo.create({
        id: spec.caseId,
        merchant_id: spec.merchantId,
        order_id: spec.orderId,
        payment_id: spec.paymentId,
        case_type: 'PAYMENT_FAILURE',
        amount_at_risk: spec.amountPaise,
        recoverability_score: spec.score,
        expected_recovery_value: spec.expectedValue,
        diagnosis: spec.diagnosis,
        diagnosis_confidence: spec.diagConfidence,
        priority_score: Math.round(spec.score * 100),
        recommended_action: spec.action,
        action_confidence: spec.actionConfidence,
        policy_decision: spec.policyDecision,
        status: spec.status,
        retry_count: spec.retryCount,
        notification_count: spec.actionStatus === 'SUCCEEDED' ? 1 : 0,
        started_at: hours(spec.startedHoursAgo),
        expires_at: futureHours(24 - spec.startedHoursAgo),
        recovered_amount: spec.recoveredAmount || 0,
        closed_at: spec.status === 'RECOVERED' || spec.status === 'STOPPED' || spec.status === 'FAILED' ? hours(spec.startedHoursAgo - 1) : undefined,
        close_reason: spec.closeReason
      });

      // AI Decision
      await aiRepo.create({
        id: `aid_${spec.caseId}`,
        recovery_case_id: spec.caseId,
        model: 'gemini-2.5-flash',
        prompt_version: 'RazorRecover-AI-Decision-v1.2.0',
        input_context_hash: `hash_${spec.caseId}`,
        diagnosis: spec.diagnosis,
        recovery_probability: spec.score,
        recommended_action: spec.action,
        rationale: `AI diagnosis identified ${spec.diagnosis.replace(/_/g, ' ')} with ${(spec.diagConfidence * 100).toFixed(0)}% confidence on ${spec.bank} ${spec.method.toUpperCase()} rail.`,
        confidence: spec.actionConfidence,
        created_at: hours(spec.startedHoursAgo)
      });

      // Policy Decision
      await policyRepo.create({
        id: `pol_${spec.caseId}`,
        recovery_case_id: spec.caseId,
        action: spec.action,
        allowed: spec.policyDecision === 'APPROVED',
        reasons: spec.policyDecision === 'APPROVED' ? ['Action satisfies all merchant security and retry limits'] : spec.violatedRules,
        violated_rules: spec.violatedRules,
        requires_human: spec.policyDecision === 'HUMAN_REQUIRED',
        policy_version: 'policy-engine-v1.0',
        created_at: hours(spec.startedHoursAgo)
      });

      // Recovery Action (if action attempted)
      if (spec.actionStatus) {
        await actionRepo.createAction({
          recovery_case_id: spec.caseId,
          merchant_id: spec.merchantId,
          action_type: spec.action,
          status: spec.actionStatus,
          correlation_id: `corr_${spec.caseId}`,
          idempotency_key: `idem_${spec.caseId}_${spec.retryCount}`,
          attempt_number: spec.retryCount + 1,
          requested_at: hours(spec.startedHoursAgo - 0.1),
          started_at: hours(spec.startedHoursAgo - 0.05),
          completed_at: spec.actionStatus !== 'PENDING' ? hours(spec.startedHoursAgo - 0.01) : undefined,
          result_summary: spec.actionStatus === 'SUCCEEDED' ? `Executed ${spec.action} successfully` : spec.actionStatus === 'CANCELLED' ? `Action blocked by Policy Engine` : `Execution attempt failed`,
          simulation: true
        });
      }

      // Audit Events
      const correlationId = `corr_${spec.caseId}`;
      for (let i = 0; i < spec.auditEvents.length; i++) {
        const evType = spec.auditEvents[i];
        await auditRepo.create({
          id: `aud_${spec.caseId}_${i + 1}`,
          merchant_id: spec.merchantId,
          recovery_case_id: spec.caseId,
          event_type: evType,
          actor_type: evType.includes('HUMAN') ? 'merchant' : evType.includes('AI') ? 'ai' : 'system',
          actor_id: evType.includes('HUMAN') ? 'usr_merchant_admin' : evType.includes('AI') ? 'gemini-2.5-flash' : 'policy_engine_v1',
          action: evType,
          input_summary: `Case ${spec.caseId} amount ₹${(spec.amountPaise / 100).toLocaleString('en-IN')}`,
          decision_summary: `Status: ${spec.status}, Action: ${spec.action}`,
          policy_result: spec.policyDecision,
          outcome: 'SUCCESS',
          timestamp: hours(spec.startedHoursAgo - i * 0.05),
          correlation_id: correlationId
        });
      }
    }

    this.isSeeded = true;
    return this.getCounts();
  }

  public static async resetAll(): Promise<void> {
    const caseRepo = new RecoveryCaseRepository();
    const actionRepo = new RecoveryActionRepository();
    const policyRepo = new PolicyDecisionRepository();
    const auditRepo = new AuditEventRepository();
    const paymentRepo = new PaymentRepository();

    await caseRepo.clear();
    actionRepo.clearInMemoryStore();
    policyRepo.clearInMemoryStore();
    await auditRepo.clear();
    await paymentRepo.clear();
    this.isSeeded = false;
  }

  public static async getCounts() {
    const caseRepo = new RecoveryCaseRepository();
    const paymentRepo = new PaymentRepository();
    const auditRepo = new AuditEventRepository();

    const { total: totalCases } = await caseRepo.findAll({ limit: 1000 });
    const payments = await paymentRepo.findByMerchantId('mch_test_01');
    const { total: totalAudit } = await auditRepo.findAll({ limit: 1000 });

    return {
      merchantsCount: 4,
      customersCount: 15,
      ordersCount: totalCases,
      paymentsCount: payments.length || totalCases,
      casesCount: totalCases,
      aiDecisionsCount: totalCases,
      policyDecisionsCount: totalCases,
      actionsCount: totalCases,
      auditEventsCount: totalAudit
    };
  }
}
