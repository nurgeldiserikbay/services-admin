import {
  canDisplayCaseAction,type ModerationCaseState,type PlatformRole,
} from './platform-permissions';

export type CaseReview={
  id:string;
  state:ModerationCaseState;
  subjectKind:'professional'|'organization'|'review'|'affiliation';
  createdAt:string;
  assignedAdminId:string|null;
  evidenceCount:number;
  revision:number;
};
export type ModerationDecision='retain'|'restrict'|'escalate';

export function validateModerationReview(
  c:CaseReview,
  input:{decision:ModerationDecision;reason:string;expectedRevision:number},
  claims:{role:PlatformRole;sessionExpiresAt:number;mfaVerifiedAt:number|null}|null,
  now:number,
):{valid:boolean;reason:'ok'|'forbidden'|'invalid_reason'|'stale'}{
  if(!Number.isSafeInteger(input.expectedRevision)||
     input.expectedRevision!==c.revision||c.revision<1)
    return{valid:false,reason:'stale'};
  if(typeof input.reason!=='string' ||
     input.reason.trim().length<10||input.reason.length>2000)
    return{valid:false,reason:'invalid_reason'};
  if(!['retain','restrict','escalate'].includes(input.decision) ||
     !canDisplayCaseAction(claims,c.state,'decide',input.reason,now))
    return{valid:false,reason:'forbidden'};
  return{valid:true,reason:'ok'};
}
