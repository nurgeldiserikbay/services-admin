/**
 * Presentation hints only. Never use this function to authorize API requests,
 * route access, or privileged mutations. Backend RBAC remains authoritative.
 */
const ROLE_HINTS=Object.freeze({
  owner:Object.freeze(['moderation.read','audit.read','taxonomy.read']),
  admin:Object.freeze(['moderation.read','audit.read','taxonomy.read']),
  operator:Object.freeze(['moderation.read','taxonomy.read']),
  auditor:Object.freeze(['audit.read']),
});
const CAPABILITIES=new Set(['moderation.read','audit.read','taxonomy.read']);
const MAX_ROLE_LENGTH=32;
const MAX_CAPABILITY_LENGTH=64;

/** Fail closed for unknown roles, capabilities and malformed session claims. */
export function hasAdminPresentationHint(role,capability){
  return typeof role==='string'&&role.length<=MAX_ROLE_LENGTH&&
    typeof capability==='string'&&capability.length<=MAX_CAPABILITY_LENGTH&&
    CAPABILITIES.has(capability)&&
    Object.hasOwn(ROLE_HINTS,role)&&ROLE_HINTS[role].includes(capability);
}
