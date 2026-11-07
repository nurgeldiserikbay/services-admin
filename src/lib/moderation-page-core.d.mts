export type SafeModerationCase={
 id:string;
 subjectKind:'professional'|'organization'|'review'|'affiliation';
 state:'triage'|'in_review'|'decision'|'appeal'|'closed';
 createdAt:string;
};
export function isSafeModerationCasePage(
 value:unknown,maxPageSize?:number,
):value is SafeModerationCase[];
