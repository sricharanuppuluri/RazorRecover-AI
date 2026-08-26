import { CaseStatus, AllowedAction, ActorType } from '@razorrecover/shared-types';

export interface StateTransitionContext {
  recoveryCaseId: string;
  merchantId: string;
  currentState: CaseStatus;
  targetState: CaseStatus;
  triggerEvent: string;
  actorType: ActorType;
  actorId?: string;
  action?: AllowedAction;
  reason?: string;
  correlationId: string;
  recoveredAmount?: number; // In paise
}

export interface TransitionValidationResult {
  valid: boolean;
  reason?: string;
  terminal?: boolean;
}

export interface TransitionOutcome {
  recoveryCaseId: string;
  previousState: CaseStatus;
  newState: CaseStatus;
  success: boolean;
  reason?: string;
  auditEventId?: string;
  correlationId: string;
  timestamp: string;
}
