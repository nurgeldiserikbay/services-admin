/**
 * UI presentation capabilities only. This is never authoritative: the backend
 * MUST validate separate administrator session, MFA, action-specific scope,
 * case assignment and resource permissions on EVERY request.
 *
 * Company owner/admin/operator roles are NOT platform admin roles.
 */
export const platformRoles=[
  'PlatformSuperAdmin','ModeratorLead','Moderator','Support','TaxonomyEditor','Auditor',
] as const;
export type PlatformRole=(typeof platformRoles)[number];

export const actions=[
  'moderation.read','moderation.assign','moderation.decide',
  'taxonomy.read','taxonomy.manage',
  'audit.read','users.support.read',
] as const;
export type PlatformAction=(typeof actions)[number];

const policy:Record<PlatformRole,readonly PlatformAction[]>={
  PlatformSuperAdmin:actions,
  ModeratorLead:['moderation.read','moderation.assign','moderation.decide','audit.read'],
  Moderator:['moderation.read','moderation.decide'],
  Support:['moderation.read','users.support.read'],
  TaxonomyEditor:['taxonomy.read','taxonomy.manage'],
  Auditor:['audit.read','moderation.read'],
};

/**
 * Do not accept roles from request body/query/string cookies. Caller must use
 * server-verified claims only, and backend policies remain independently enforced.
 */
export function canDisplayPlatformAction(
  verifiedClaims:{role:PlatformRole;sessionExpiresAt:number;mfaVerifiedAt:number|null}|null,
  action:PlatformAction,
  now:number,
):boolean{
  if(!verifiedClaims || !Number.isFinite(now) ||
     !Number.isFinite(verifiedClaims.sessionExpiresAt) ||
     verifiedClaims.sessionExpiresAt<=now ||
     verifiedClaims.mfaVerifiedAt===null ||
     !Number.isFinite(verifiedClaims.mfaVerifiedAt) ||
     verifiedClaims.mfaVerifiedAt>now ||
     !platformRoles.includes(verifiedClaims.role) ||
     !actions.includes(action))return false;
  return policy[verifiedClaims.role].includes(action);
}

export type ModerationCaseState='triage'|'in_review'|'decision'|'appeal'|'closed';
export type ModerationAction='assign'|'decide'|'appeal'|'close';

/**
 * UX preflight for a moderator case action; NOT a substitute for the backend
 * transition, audit log, second-level independent reviewer and case lock.
 */
export function canDisplayCaseAction(
  ctx:{role:PlatformRole;sessionExpiresAt:number;mfaVerifiedAt:number|null}|null,
  state:ModerationCaseState,
  operation:ModerationAction,
  reason:string,
  now:number,
):boolean{
  if(!reason.trim() || reason.trim().length>2000)return false;
  if(operation==='assign')return state==='triage' &&
    canDisplayPlatformAction(ctx,'moderation.assign',now);
  if(operation==='decide')return state==='in_review' &&
    canDisplayPlatformAction(ctx,'moderation.decide',now);
  if(operation==='appeal')return state==='decision' &&
    canDisplayPlatformAction(ctx,'moderation.read',now);
  if(operation==='close')return state==='decision' &&
    canDisplayPlatformAction(ctx,'moderation.decide',now);
  return false;
}
