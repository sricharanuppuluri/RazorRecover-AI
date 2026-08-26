import { CaseStatus } from '@razorrecover/shared-types';
import { StateTransitionContext, TransitionValidationResult } from './types';

// Legal standard state transitions map
const ALLOWED_DIRECT_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  NEW: ['DETECTED', 'STOPPED', 'HUMAN_REVIEW', 'RECOVERED'],
  DETECTED: ['DIAGNOSING', 'STOPPED', 'HUMAN_REVIEW', 'RECOVERED'],
  DIAGNOSING: ['SCORED', 'STOPPED', 'HUMAN_REVIEW', 'RECOVERED'],
  SCORED: ['AI_RECOMMENDED', 'STOPPED', 'HUMAN_REVIEW', 'RECOVERED'],
  AI_RECOMMENDED: ['POLICY_CHECK', 'STOPPED', 'HUMAN_REVIEW', 'RECOVERED'],
  POLICY_CHECK: ['ACTION_PENDING', 'HUMAN_REVIEW', 'STOPPED', 'RECOVERED'],
  HUMAN_REVIEW: ['ACTION_PENDING', 'STOPPED', 'RECOVERED'],
  ACTION_PENDING: ['ACTION_SENT', 'STOPPED', 'HUMAN_REVIEW', 'RECOVERED'],
  ACTION_SENT: ['WAITING_FOR_OUTCOME', 'STOPPED', 'HUMAN_REVIEW', 'RECOVERED'],
  WAITING_FOR_OUTCOME: ['RECOVERED', 'FAILED', 'STOPPED', 'HUMAN_REVIEW'],
  FAILED: ['ACTION_PENDING', 'STOPPED', 'HUMAN_REVIEW', 'RECOVERED'],
  RECOVERED: [], // Terminal state
  STOPPED: []    // Terminal state
};

const TERMINAL_STATES: CaseStatus[] = ['RECOVERED', 'STOPPED'];

export class RecoveryStateMachine {
  /**
   * Validates whether a state transition from currentState to targetState is permitted.
   */
  public static validateTransition(ctx: StateTransitionContext): TransitionValidationResult {
    const { currentState, targetState } = ctx;

    // 1. Same state transition check
    if (currentState === targetState) {
      return {
        valid: false,
        reason: `Cannot transition from state ${currentState} to itself.`
      };
    }

    // 2. Terminal state lock check: Once RECOVERED or STOPPED, no further transitions are allowed
    if (TERMINAL_STATES.includes(currentState)) {
      return {
        valid: false,
        reason: `Cannot transition out of terminal state ${currentState}.`,
        terminal: true
      };
    }

    // 3. Global override: Transition to RECOVERED from any active state is ALWAYS allowed when trusted payment capture is confirmed
    if (targetState === 'RECOVERED') {
      return {
        valid: true,
        terminal: true
      };
    }

    // 4. Global override: Transition to STOPPED from any active state is allowed for safety stops (expiry, limits, opt-out)
    if (targetState === 'STOPPED') {
      return {
        valid: true,
        terminal: true
      };
    }

    // 5. Global override: Transition to HUMAN_REVIEW from any active state is allowed for escalation
    if (targetState === 'HUMAN_REVIEW') {
      return {
        valid: true
      };
    }

    // 6. Direct legal transitions lookup
    const allowed = ALLOWED_DIRECT_TRANSITIONS[currentState] || [];
    if (allowed.includes(targetState)) {
      return {
        valid: true,
        terminal: TERMINAL_STATES.includes(targetState)
      };
    }

    return {
      valid: false,
      reason: `Illegal transition requested from ${currentState} to ${targetState}.`
    };
  }

  /**
   * Helper to check if a status is terminal.
   */
  public static isTerminal(status: CaseStatus): boolean {
    return TERMINAL_STATES.includes(status);
  }
}
