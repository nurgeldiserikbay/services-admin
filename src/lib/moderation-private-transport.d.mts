import type {SafeModerationCase} from './moderation-page-core.mjs';
export class ModerationTransportUnavailable extends Error{}
export function fetchTrustedModerationCases(input:{
 apiBaseUrl:string;bearer:string;transport?:typeof fetch;
}):Promise<SafeModerationCase[]>;
