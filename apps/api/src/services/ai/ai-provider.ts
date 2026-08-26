import { AIDecisionOutput, AIInputContext } from '@razorrecover/shared-types';
import { buildSystemPrompt, buildUserPrompt } from './prompt-builder';
import { validateAIDecisionOutput } from './schemas';

export interface AIProvider {
  generateDecision(context: AIInputContext): Promise<AIDecisionOutput>;
}

/**
 * Deterministic Mock AI Provider for testing and offline/fallback operation.
 * Guarantees schema-valid decisions without network requests.
 */
export class MockAIProvider implements AIProvider {
  public async generateDecision(context: AIInputContext): Promise<AIDecisionOutput> {
    const { diagnosis, recoveryProbability, highValue } = context.analysis;
    const category = diagnosis.category;

    if (category === 'ALREADY_CAPTURED') {
      return {
        diagnosis: 'ALREADY_CAPTURED',
        recoveryProbability: 0.0,
        recommendedAction: 'NO_ACTION',
        rationale: 'Payment is already captured or order is paid. No action required.',
        confidence: 1.0
      };
    }

    if (category === 'TEMPORARY_BANK_DEGRADATION') {
      return {
        diagnosis: 'TEMPORARY_BANK_DEGRADATION',
        recoveryProbability: Math.min(0.95, recoveryProbability + 0.05),
        recommendedAction: highValue ? 'ESCALATE' : 'RETRY',
        rationale: 'Temporary gateway/bank issue detected. Retry recommended after degradation window.',
        confidence: 0.88
      };
    }

    if (category === 'CUSTOMER_AUTHENTICATION_ISSUE') {
      return {
        diagnosis: 'CUSTOMER_AUTHENTICATION_ISSUE',
        recoveryProbability: recoveryProbability,
        recommendedAction: 'NOTIFY',
        rationale: '3DS/OTP authentication failed. Customer notification for retry recommended.',
        confidence: 0.82
      };
    }

    if (category === 'INSUFFICIENT_FUNDS') {
      return {
        diagnosis: 'INSUFFICIENT_FUNDS',
        recoveryProbability: recoveryProbability,
        recommendedAction: 'NOTIFY',
        rationale: 'Insufficient funds signal. Soft reminder suggested.',
        confidence: 0.75
      };
    }

    if (category === 'REPEATED_FAILURE') {
      return {
        diagnosis: 'REPEATED_FAILURE',
        recoveryProbability: Math.max(0.05, recoveryProbability - 0.1),
        recommendedAction: 'ESCALATE',
        rationale: 'Multiple consecutive payment attempts failed. Human review suggested.',
        confidence: 0.90
      };
    }

    if (category === 'CHECKOUT_ABANDONMENT') {
      return {
        diagnosis: 'CHECKOUT_ABANDONMENT',
        recoveryProbability: recoveryProbability,
        recommendedAction: 'NOTIFY',
        rationale: 'Checkout session expired before payment attempt. Nudge suggested.',
        confidence: 0.70
      };
    }

    // Default / Unknown
    return {
      diagnosis: category || 'UNKNOWN_OR_AMBIGUOUS',
      recoveryProbability: Math.min(0.5, recoveryProbability),
      recommendedAction: 'ESCALATE',
      rationale: 'Ambiguous signals detected. Conservative escalation advised.',
      confidence: 0.50
    };
  }
}

/**
 * External LLM AI Provider supporting Gemini or OpenAI style API calls.
 * Uses process.env.LLM_API_KEY and process.env.LLM_MODEL.
 */
export class GeminiAIProvider implements AIProvider {
  private apiKey: string;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    this.apiKey = apiKey || process.env.LLM_API_KEY || '';
    this.modelName = modelName || process.env.LLM_MODEL || 'gemini-2.5-flash';
  }

  public async generateDecision(context: AIInputContext): Promise<AIDecisionOutput> {
    if (!this.apiKey) {
      throw new Error('LLM_API_KEY environment variable is missing or empty');
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(context);

    // Call Google Gemini REST endpoint directly without external heavy dependencies
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM Provider call failed with HTTP ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data: any = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('LLM Provider returned an empty response candidate');
    }

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (e: any) {
      throw new Error(`LLM Provider output was not valid JSON: ${rawText.substring(0, 100)}`);
    }

    const validation = validateAIDecisionOutput(parsedJson);
    if (!validation.valid || !validation.output) {
      throw new Error(`LLM Provider output failed schema validation: ${validation.errors.join('; ')}`);
    }

    return validation.output;
  }
}

/**
 * Factory function for creating the appropriate AIProvider based on environment.
 */
export function getAIProvider(forceMock: boolean = false): AIProvider {
  if (forceMock || process.env.NODE_ENV === 'test' || !process.env.LLM_API_KEY) {
    return new MockAIProvider();
  }
  return new GeminiAIProvider();
}
