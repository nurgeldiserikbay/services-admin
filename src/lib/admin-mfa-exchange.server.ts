import 'server-only';

/**
 * Strict validation of a trusted private MFA exchange acknowledgement.
 * This is NOT a browser endpoint, login route or MFA credential collector.
 * The backend controller remains unregistered until vault/ingress approval.
 */
const TOKEN=/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/;
const MAX_TTL_MS=15*60*1000;

export type PrivateMfaSession=Readonly<{token:string;expiresAt:number}>;

export function validatePrivateMfaSession(
 payload:unknown,now:number,
):PrivateMfaSession|null{
 if(!Number.isSafeInteger(now)||now<0||
    !payload||typeof payload!=='object'||Array.isArray(payload)||
    Object.getPrototypeOf(payload)!==Object.prototype)return null;
 const keys=Reflect.ownKeys(payload);
 const descriptors=Object.getOwnPropertyDescriptors(payload);
 if(keys.length!==2||
    !Object.hasOwn(descriptors,'session_token')||
    !Object.hasOwn(descriptors,'expires_at'))return null;
 const token=descriptors.session_token;
 const expiry=descriptors.expires_at;
 if(!token||!expiry||!token.enumerable||!expiry.enumerable||
    !Object.hasOwn(token,'value')||!Object.hasOwn(expiry,'value')||
    typeof token.value!=='string'||!TOKEN.test(token.value)||
    !Number.isSafeInteger(expiry.value)||expiry.value<=now||
    expiry.value>now+MAX_TTL_MS)return null;
 return {token:token.value,expiresAt:expiry.value};
}
