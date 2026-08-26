import { PromiseToPayRepository } from '../repositories/promise-to-pay.repository';
import { AuditEventRepository } from '../repositories/audit-event.repository';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { PromiseToPay, PromiseStatus, UserRole } from '@razorrecover/shared-types';

export class PromiseToPayService {
  private promiseRepo = new PromiseToPayRepository();
  private auditRepo = new AuditEventRepository();
  private caseRepo = new RecoveryCaseRepository();

  public async createPromise(
    merchantId: string,
    recoveryCaseId: string,
    promisedAmount: number,
    promisedDate: string,
    notes?: string,
    actorId = 'system'
  ): Promise<PromiseToPay> {
    const rCase = await this.caseRepo.findById(recoveryCaseId);
    if (!rCase || rCase.merchant_id !== merchantId) {
      throw new Error(`Recovery case ${recoveryCaseId} not found or unauthorized`);
    }

    const promise = await this.promiseRepo.create({
      merchantId,
      recoveryCaseId,
      customerId: (rCase as any).customerId || 'cust_unknown',
      promisedAmount,
      promisedDate,
      status: 'PENDING',
      notes,
    });

    await this.auditRepo.create({
      merchant_id: merchantId,
      recovery_case_id: recoveryCaseId,
      event_type: 'PROMISE_TO_PAY_CREATED',
      actor_type: 'merchant',
      actor_id: actorId,
      action: 'CREATE_PROMISE',
      input_summary: `Promised ₹${(promisedAmount / 100).toFixed(2)} on ${promisedDate}`,
      decision_summary: `Created pending promise commitment`,
      policy_result: 'ALLOWED',
      outcome: 'SUCCESS',
      timestamp: new Date().toISOString(),
    });

    return promise;
  }

  public async updatePromiseStatus(
    id: string,
    merchantId: string,
    newStatus: PromiseStatus,
    actorId = 'system'
  ): Promise<PromiseToPay> {
    const updated = await this.promiseRepo.updateStatus(id, merchantId, newStatus);
    if (!updated) {
      throw new Error(`Promise ${id} not found or unauthorized`);
    }

    await this.auditRepo.create({
      merchant_id: merchantId,
      recovery_case_id: updated.recoveryCaseId,
      event_type: `PROMISE_TO_PAY_${newStatus}`,
      actor_type: 'merchant',
      actor_id: actorId,
      action: 'UPDATE_PROMISE_STATUS',
      input_summary: `Status updated to ${newStatus}`,
      decision_summary: `Promise-to-pay status set to ${newStatus}`,
      policy_result: 'ALLOWED',
      outcome: 'SUCCESS',
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  public async getPromisesForCase(recoveryCaseId: string, merchantId: string): Promise<PromiseToPay[]> {
    return this.promiseRepo.findByCaseId(recoveryCaseId, merchantId);
  }

  public async listPromises(merchantId: string): Promise<PromiseToPay[]> {
    return this.promiseRepo.listByMerchant(merchantId);
  }
}
