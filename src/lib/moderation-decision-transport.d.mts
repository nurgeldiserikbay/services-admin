export type ModerationDecisionBody={profile_id:string;profile_version:number;decision:'APPROVE'|'REJECT'};
export function validModerationDecisionBody(body:unknown):body is ModerationDecisionBody;
export function submitModerationDecision(input:{origin:string;bearer:string;caseId:string;body:ModerationDecisionBody;transport?:typeof fetch}):Promise<'decided'|'conflict'|'unavailable'>;
