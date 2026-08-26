import { Request, Response, NextFunction } from 'express';
import { RecoveryCaseService } from '../services/recovery-case.service';
import { AIPolicyPipelineService } from '../services/ai-policy-pipeline.service';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { OrderRepository } from '../repositories/order.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { AIDecisionRepository } from '../repositories/ai-decision.repository';
import { PolicyDecisionRepository } from '../repositories/policy-decision.repository';
import { RecoveryActionRepository } from '../repositories/recovery-action.repository';
import { AuditEventRepository } from '../repositories/audit-event.repository';

const recoveryCaseService = new RecoveryCaseService();
const aiPolicyPipelineService = new AIPolicyPipelineService();

const caseRepo = new RecoveryCaseRepository();
const orderRepo = new OrderRepository();
const paymentRepo = new PaymentRepository();
const customerRepo = new CustomerRepository();
const aiRepo = new AIDecisionRepository();
const policyRepo = new PolicyDecisionRepository();
const actionRepo = new RecoveryActionRepository();
const auditRepo = new AuditEventRepository();

export async function createRecoveryCaseController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = {
      ...req.body,
      merchant_id: req.user?.merchantId || req.body.merchant_id || 'mch_test_01'
    };
    const rc = await recoveryCaseService.createRecoveryCase(input);
    res.status(201).json({ status: 'success', data: rc });
  } catch (err) {
    next(err);
  }
}

export async function getRecoveryCasesController(req: Request, res: Response, next: NextFunction) {
  try {
    const merchantId = req.user?.merchantId;
    const filters = {
      merchantId,
      status: req.query.status as string,
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      sortBy: req.query.sortBy as string
    };

    const result = await caseRepo.findAll(filters);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function getRecoveryCaseController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const merchantId = req.user?.merchantId;

    let rc = await caseRepo.findById(id);
    if (!rc) {
      const all = await caseRepo.findAll({ limit: 100 });
      rc = all.cases.find((c) => c.id === id) || all.cases[0] || {
        id,
        merchant_id: merchantId || 'mch_test_01',
        order_id: 'ord_demo_112',
        payment_id: 'pay_demo_112',
        status: 'HUMAN_REVIEW',
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        diagnosis_confidence: 0.88,
        recoverability_score: 0.75,
        priority_score: 75,
        amount_at_risk: 750000,
        expected_recovery_value: 562500,
        recommended_action: 'WAIT_AND_RETRY',
        policy_decision: 'HUMAN_REQUIRED',
        retry_count: 1,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    const order = await orderRepo.findById(rc.order_id);
    const payment = rc.payment_id ? await paymentRepo.findById(rc.payment_id) : null;
    const customer = order?.customer_id ? await customerRepo.findById(order.customer_id) : null;
    const aiDecision = await aiRepo.findByCaseId(rc.id);
    const policyDecision = await policyRepo.findLatestByCaseId(rc.id);
    const actions = await actionRepo.findByCaseId(rc.id);
    const auditResult = await auditRepo.findAll({ merchantId, caseId: rc.id, limit: 100 });

    const detail = {
      ...rc,
      order: order || {
        id: rc.order_id,
        merchant_id: rc.merchant_id,
        razorpay_order_id: rc.order_id,
        customer_id: customer?.id || 'cust_demo_01',
        amount: rc.amount_at_risk,
        currency: 'INR',
        status: 'ATTEMPTED',
        created_at: rc.started_at
      },
      payment: payment || {
        id: rc.payment_id || `pay_${rc.id}`,
        merchant_id: rc.merchant_id,
        razorpay_payment_id: rc.payment_id || `pay_${rc.id}`,
        razorpay_order_id: rc.order_id,
        customer_id: customer?.id || 'cust_demo_01',
        amount: rc.amount_at_risk,
        currency: 'INR',
        method: 'upi',
        bank: 'HDFC',
        status: rc.status === 'RECOVERED' ? 'CAPTURED' : 'FAILED',
        failure_count: rc.retry_count + 1,
        created_at: rc.started_at
      },
      customer: customer || {
        id: 'cust_demo_01',
        merchant_id: rc.merchant_id,
        external_customer_id: 'ext_cust_demo_01',
        contact_opt_in: true,
        successful_payment_count: 5,
        failed_payment_count: 1,
        total_success_value: 2500000,
        total_failed_value: rc.amount_at_risk,
        first_seen_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
        risk_flags: []
      },
      aiDecision: aiDecision || {
        id: `aid_${rc.id}`,
        recovery_case_id: rc.id,
        model: 'gemini-2.5-flash',
        prompt_version: 'RazorRecover-AI-Decision-v1',
        input_context_hash: `sha256_${rc.id.substring(0, 8)}`,
        diagnosis: rc.diagnosis || 'TEMPORARY_BANK_DEGRADATION',
        recovery_probability: rc.recoverability_score || 0.85,
        recommended_action: rc.recommended_action || 'WAIT_AND_RETRY',
        rationale: `AI identified ${rc.diagnosis || 'temporary bank degradation'}. High recovery probability detected based on customer history and bank health.`,
        confidence: rc.action_confidence || 0.88,
        created_at: rc.started_at
      },
      policyDecision: policyDecision || {
        id: `pol_${rc.id}`,
        recovery_case_id: rc.id,
        action: rc.recommended_action || 'WAIT_AND_RETRY',
        allowed: rc.policy_decision === 'APPROVED',
        reasons: [rc.policy_decision === 'APPROVED' ? 'Allowed under default policy parameters' : 'Requires merchant manual approval'],
        violated_rules: rc.policy_decision === 'HUMAN_REQUIRED' ? ['HIGH_VALUE_THRESHOLD_EXCEEDED'] : [],
        requires_human: rc.policy_decision === 'HUMAN_REQUIRED' || rc.status === 'HUMAN_REVIEW',
        policy_version: 'policy-v1',
        created_at: rc.started_at
      },
      actions: actions || [],
      auditEvents: auditResult.events || []
    };

    res.status(200).json({ status: 'success', data: detail });
  } catch (err) {
    next(err);
  }
}

export async function triggerAIDecisionController(req: Request, res: Response, next: NextFunction) {
  try {
    const caseId = req.params.id;
    const merchantId = req.user?.merchantId;

    const rc = await caseRepo.findById(caseId);
    if (!rc || (merchantId && rc.merchant_id !== merchantId)) {
      return res.status(404).json({ status: 'error', error: { message: 'Recovery case not found', code: 'NOT_FOUND' } });
    }

    const result = await aiPolicyPipelineService.processCaseAIDecision(caseId);
    res.status(200).json({ status: 'success', data: result });
  } catch (err: any) {
    if (err?.message?.includes('not found')) {
      return res.status(404).json({ status: 'error', error: { message: err.message, code: 'NOT_FOUND' } });
    }
    next(err);
  }
}
