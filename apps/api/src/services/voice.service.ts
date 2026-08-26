import { VoiceCallRequest, VoiceInteractionRequest, VoiceSession, VoiceLanguage } from '@razorrecover/shared-types';
import { VoiceSessionRepository } from '../repositories/voice-session.repository';
import { RecoveryCaseRepository } from '../repositories/recovery-case.repository';
import { AuditEventRepository } from '../repositories/audit-event.repository';
import { MockVoiceProvider, IVoiceProvider } from './voice-provider.service';

export class VoiceService {
  private voiceSessionRepo = new VoiceSessionRepository();
  private caseRepo = new RecoveryCaseRepository();
  private auditRepo = new AuditEventRepository();
  private voiceProvider: IVoiceProvider = new MockVoiceProvider();

  public async initiateVoiceCall(merchantId: string, req: VoiceCallRequest): Promise<VoiceSession> {
    const caseRecord = await this.caseRepo.findById(req.recoveryCaseId);
    if (!caseRecord || caseRecord.merchant_id !== merchantId) {
      throw new Error('Recovery case not found or unauthorized');
    }

    if (caseRecord.status === 'RECOVERED' || caseRecord.status === 'STOPPED' || caseRecord.status === 'FAILED') {
      throw new Error(`Cannot initiate voice recovery call for case in state ${caseRecord.status}`);
    }

    const phoneNumber = '+919876543210';
    const language: VoiceLanguage = req.language || 'HINGLISH';

    const sessionId = `vcs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const greeting = language === 'HINGLISH'
      ? `Namaste! Main Razorpay Merchant AI Support se baat kar raha hoon. Aapka ₹${(caseRecord.amount_at_risk / 100).toLocaleString('en-IN')} ka payment fail ho gaya tha. Kya main payment complete karne mein madad karun?`
      : `Hello! I am calling from Merchant Support regarding your failed payment of ₹${(caseRecord.amount_at_risk / 100).toLocaleString('en-IN')}. Would you like me to help complete the transaction?`;

    const session: VoiceSession = {
      id: sessionId,
      merchantId,
      recoveryCaseId: req.recoveryCaseId,
      phoneNumber,
      language,
      status: 'INITIATED',
      transcript: [
        {
          speaker: 'ASSISTANT',
          text: greeting,
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await this.voiceSessionRepo.create(session);

    await this.auditRepo.create({
      merchant_id: merchantId,
      recovery_case_id: req.recoveryCaseId,
      event_type: 'VOICE_CALL_INITIATED',
      actor_type: 'system',
      actor_id: 'voice_assistant',
      action: 'INITIATE_VOICE_RECOVERY',
      decision_summary: `Initiated ${language} voice recovery call to customer ${phoneNumber} for case ${req.recoveryCaseId}`,
      outcome: 'APPROVED',
    });

    return session;
  }

  public async interact(merchantId: string, req: VoiceInteractionRequest): Promise<{ session: VoiceSession; spokenResponse: string }> {
    const session = await this.voiceSessionRepo.findById(req.sessionId);
    if (!session || session.merchantId !== merchantId) {
      throw new Error('Voice session not found or unauthorized');
    }

    if (session.status === 'COMPLETED' || session.status === 'OPTED_OUT' || session.status === 'FAILED') {
      throw new Error(`Voice call session is already ${session.status}`);
    }

    const now = new Date().toISOString();
    session.status = 'IN_PROGRESS';
    session.lastUtterance = req.userUtterance;
    session.transcript.push({
      speaker: 'CUSTOMER',
      text: req.userUtterance,
      timestamp: now,
    });

    // Provider utterance processing
    const providerRes = await this.voiceProvider.processUtterance(session.id, req.userUtterance, session.language);
    session.detectedIntent = providerRes.detectedIntent;

    const caseRecord = await this.caseRepo.findById(session.recoveryCaseId);
    let actionExecuted: string | undefined = undefined;
    let actionResult: string | undefined = undefined;

    // Handle intents and trigger state machine transitions safely
    if (providerRes.detectedIntent === 'OPTOUT') {
      session.status = 'OPTED_OUT';
      if (caseRecord && caseRecord.status !== 'RECOVERED') {
        caseRecord.status = 'STOPPED';
        await this.caseRepo.update(caseRecord);
      }
      actionExecuted = 'STOP';
      actionResult = 'Customer opted out via voice call. Recovery workflow stopped.';
    } else if (providerRes.detectedIntent === 'REQUEST_PAYMENT_LINK' && caseRecord) {
      actionExecuted = 'SEND_RECOVERY_LINK';
      actionResult = `Payment recovery link dispatched via WhatsApp/SMS. (Case remaining in ${caseRecord.status} until Razorpay webhook capture)`;
      await this.caseRepo.incrementNotificationCount(caseRecord.id);
    } else if (providerRes.detectedIntent === 'CONFIRM_RETRY' && caseRecord) {
      actionExecuted = 'WAIT_AND_RETRY';
      actionResult = `Scheduled immediate payment retry. (Case status: ${caseRecord.status}, awaiting Razorpay payment capture confirmation)`;
      await this.caseRepo.incrementRetryCount(caseRecord.id);
    } else if (providerRes.detectedIntent === 'ESCALATE_HUMAN' && caseRecord) {
      actionExecuted = 'ESCALATE_HUMAN';
      caseRecord.status = 'HUMAN_REVIEW';
      caseRecord.policy_decision = 'HUMAN_REQUIRED';
      await this.caseRepo.update(caseRecord);
      actionResult = 'Case escalated to merchant human review queue.';
    }

    session.executedAction = actionExecuted;
    session.actionResult = actionResult;

    session.transcript.push({
      speaker: 'ASSISTANT',
      text: providerRes.spokenResponse,
      timestamp: new Date().toISOString(),
    });

    session.updatedAt = new Date().toISOString();
    await this.voiceSessionRepo.update(session);

    // Record audit event
    await this.auditRepo.create({
      merchant_id: merchantId,
      recovery_case_id: session.recoveryCaseId,
      event_type: 'VOICE_INTENT_PARSED',
      actor_type: 'customer',
      actor_id: session.phoneNumber,
      action: actionExecuted || 'VOICE_INTERACTION',
      decision_summary: `Recognized intent '${providerRes.detectedIntent}' (confidence: ${providerRes.confidence}). Action: ${actionExecuted || 'NONE'}. Result: ${actionResult || providerRes.spokenResponse}`,
      outcome: 'APPROVED',
    });

    return {
      session,
      spokenResponse: providerRes.spokenResponse,
    };
  }

  public async getSession(merchantId: string, sessionId: string): Promise<VoiceSession> {
    const session = await this.voiceSessionRepo.findById(sessionId);
    if (!session || session.merchantId !== merchantId) {
      throw new Error('Voice session not found or unauthorized');
    }
    return session;
  }

  public async listSessions(merchantId: string): Promise<VoiceSession[]> {
    return this.voiceSessionRepo.findByMerchant(merchantId);
  }
}
