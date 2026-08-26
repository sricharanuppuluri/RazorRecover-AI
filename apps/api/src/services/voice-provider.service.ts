import { VoiceIntentType, VoiceLanguage, VoiceProviderResponse } from '@razorrecover/shared-types';
import { env } from '../config/env';

export interface IVoiceProvider {
  processUtterance(
    sessionId: string,
    userUtterance: string,
    language: VoiceLanguage
  ): Promise<VoiceProviderResponse>;
}

export class MockVoiceProvider implements IVoiceProvider {
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.apiKey = process.env.VOICE_PROVIDER_KEY || 'mock_voice_key_dev';
    this.apiSecret = process.env.VOICE_PROVIDER_SECRET || 'mock_voice_secret_dev';
  }

  public async processUtterance(
    sessionId: string,
    userUtterance: string,
    language: VoiceLanguage
  ): Promise<VoiceProviderResponse> {
    const textLower = userUtterance.toLowerCase().trim();

    let detectedIntent: VoiceIntentType = 'UNKNOWN';
    let confidence = 0.85;
    let spokenResponse = '';
    let suggestedAction: string | undefined = undefined;

    // Hinglish & English NLP pattern matching for voice intent resolution
    if (textLower.includes('link') || textLower.includes('send link') || textLower.includes('link bhejo') || textLower.includes('whatsapp')) {
      detectedIntent = 'REQUEST_PAYMENT_LINK';
      confidence = 0.95;
      suggestedAction = 'SEND_RECOVERY_LINK';
      spokenResponse = language === 'HINGLISH'
        ? 'Aapke WhatsApp par secure payment link bhej diya gaya hai. Kripya payment complete karein.'
        : 'A secure payment link has been sent to your registered mobile number.';
    } else if (textLower.includes('retry') || textLower.includes('try again') || textLower.includes('dobara try') || textLower.includes('phir se try')) {
      detectedIntent = 'CONFIRM_RETRY';
      confidence = 0.92;
      suggestedAction = 'WAIT_AND_RETRY';
      spokenResponse = language === 'HINGLISH'
        ? 'Ji bilkul, hum payment dobara retry kar rahe hain. Kripya apna bank app check karein.'
        : 'Understood, we are initiating a payment retry attempt.';
    } else if (textLower.includes('status') || textLower.includes('kya hua') || textLower.includes('check status')) {
      detectedIntent = 'CHECK_STATUS';
      confidence = 0.90;
      spokenResponse = language === 'HINGLISH'
        ? 'Aapka payment pending status mein hai. Technical issue solve ho gaya hai.'
        : 'Your payment attempt failed due to temporary bank degradation and can be retried.';
    } else if (textLower.includes('stop') || textLower.includes('don\'t call') || textLower.includes('mat karo') || textLower.includes('optout') || textLower.includes('cancel')) {
      detectedIntent = 'OPTOUT';
      confidence = 0.98;
      suggestedAction = 'STOP';
      spokenResponse = language === 'HINGLISH'
        ? 'Aapki request record kar li gayi hai. Ab hum aapko call ya message nahi karenge.'
        : 'You have been opted out of recovery communications.';
    } else if (textLower.includes('agent') || textLower.includes('human') || textLower.includes('support') || textLower.includes('baat karo')) {
      detectedIntent = 'ESCALATE_HUMAN';
      confidence = 0.91;
      suggestedAction = 'ESCALATE_HUMAN';
      spokenResponse = language === 'HINGLISH'
        ? 'Aapki call human support executive ko escalate ki ja rahi hai.'
        : 'Your request is being escalated to a human support representative.';
    } else {
      detectedIntent = 'UNKNOWN';
      confidence = 0.60;
      spokenResponse = language === 'HINGLISH'
        ? 'Kripya dobara kahein. Kya aap payment link chahte hain ya payment retry karna chahte hain?'
        : 'Could you please repeat? Would you like a payment link or a retry attempt?';
    }

    return {
      sessionId,
      recognizedText: userUtterance,
      detectedIntent,
      confidence,
      spokenResponse,
      suggestedAction,
    };
  }
}
