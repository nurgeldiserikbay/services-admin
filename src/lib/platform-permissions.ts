/**
 * UI capability hints matching the currently implemented backend role contract.
 * Never authoritative: the backend validates a separate privileged session,
 * MFA freshness, action, and exact resource scope on EVERY request.
 *
 * "owner" is a platform owner role, not a company or specialist owner role.
 */
export const platformRoles=['owner','admin','operator','auditor'] as const;
export type PlatformRole=(typeof platformRoles)[number];

export const actions=[
  'moderation.read','moderation.decide','audit.read',
  'taxonomy.read','taxonomy.publish',
  'platform_roles.read','platform_roles.manage',
] as const;
export type PlatformAction=(typeof actions)[number];

const MAX_MFA_AGE_MS=15*60*1000;
const policy:Record<PlatformRole,readonly PlatformAction[]>={
  owner:actions,
  admin:['moderation.read','moderation.decide','audit.read','taxonomy.read',
    'taxonomy.publish','platform_roles.read'],
  operator:['moderation.read','moderation.decide','taxonomy.read'],
  auditor:['moderation.read','audit.read','taxonomy.read'],
};

export function canDisplayPlatformAction(
  verifiedClaims:{role:PlatformRole;sessionExpiresAt:number;mfaVerifiedAt:number|null}|null,
  action:PlatformAction,
  now:number,
):boolean{
  if(!verifiedClaims || typeof verifiedClaims!=='object' ||
     !Number.isSafeInteger(now) ||
     !Number.isSafeInteger(verifiedClaims.sessionExpiresAt) ||
     verifiedClaims.sessionExpiresAt<=now ||
     !Number.isSafeInteger(verifiedClaims.mfaVerifiedAt) ||
     verifiedClaims.mfaVerifiedAt===null ||
     verifiedClaims.mfaVerifiedAt>now ||
     now-verifiedClaims.mfaVerifiedAt>MAX_MFA_AGE_MS ||
     typeof verifiedClaims.role!=='string' ||
     !platformRoles.includes(verifiedClaims.role) ||
     typeof action!=='string' || !actions.includes(action))return false;
  return policy[verifiedClaims.role].includes(action);
}

export type ModerationCaseState='triage'|'in_review'|'decision'|'appeal'|'closed';
/** Only decision has a reviewed operation in the implemented backend contract. */
export type ModerationAction='decide';

export function canDisplayCaseAction(
  ctx:{role:PlatformRole;sessionExpiresAt:number;mfaVerifiedAt:number|null}|null,
  state:ModerationCaseState,
  operation:ModerationAction,
  reason:string,
  now:number,
):boolean{
  if(typeof reason!=='string'||!reason.trim()||reason.trim().length>2000)return false;
  return operation==='decide'&&state==='in_review'&&
    canDisplayPlatformAction(ctx,'moderation.decide',now);
}
