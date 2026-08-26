import { RecoveryStateMachine } from './state-machine';
import { StateTransitionContext, TransitionOutcome } from './types';

export class RecoveryTransitionService {
  /**
   * Evaluates and validates a state transition request.
   */
  public static processTransition(ctx: StateTransitionContext): TransitionOutcome {
    const validation = RecoveryStateMachine.validateTransition(ctx);
    const timestamp = new Date().toISOString();

    if (!validation.valid) {
      return {
        recoveryCaseId: ctx.recoveryCaseId,
        previousState: ctx.currentState,
        newState: ctx.currentState, // Unchanged
        success: false,
        reason: validation.reason,
        correlationId: ctx.correlationId,
        timestamp
      };
    }

    return {
      recoveryCaseId: ctx.recoveryCaseId,
      previousState: ctx.currentState,
      newState: ctx.targetState,
      success: true,
      reason: ctx.reason,
      correlationId: ctx.correlationId,
      timestamp
    };
  }
}
