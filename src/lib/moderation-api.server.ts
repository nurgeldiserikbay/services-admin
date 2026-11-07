import 'server-only';
import {fetchTrustedModerationCases} from './moderation-private-transport.mjs';

/**
 * Deliberately unmounted until dedicated admin login, verified backend
 * moderation API and deployment network allowlisting are implemented.
 * Bearer MUST originate from server-side privileged session storage.
 */
export async function getModerationCasesForVerifiedAdmin(adminBearer:string){
 if(process.env.SERVICES_ADMIN_MODERATION_HTTP!=='enabled')
  throw new Error('Admin moderation integration unavailable');
 return fetchTrustedModerationCases({
  apiBaseUrl:process.env.SERVICES_ADMIN_API_BASE_URL??'',
  bearer:adminBearer,
 });
}
