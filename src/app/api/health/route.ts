import {NextResponse} from 'next/server';

/** Liveness only. Never report database connectivity, secrets or admin session state. */
export const dynamic='force-dynamic';
export function GET(){
  return NextResponse.json({status:'ok',service:'services-admin'},
    {headers:{'Cache-Control':'no-store'}});
}
