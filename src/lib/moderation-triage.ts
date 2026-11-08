import {isSafeModerationCasePage} from './moderation-page-core.mjs';
import type {PublicModerationCaseSummary} from '../components/ModerationCaseTable';

/** Presentation-only filters for an already ACL-filtered, paginated server list. */
export type TriageFilter=Readonly<{
  state:'all'|'triage'|'in_review'|'decision'|'appeal'|'closed';
  kind:'all'|'professional'|'organization'|'review'|'affiliation';
}>;
export const DEFAULT_TRIAGE_FILTER:TriageFilter={state:'triage',kind:'all'};

export function filterModerationCases(
  data:readonly PublicModerationCaseSummary[],filter:TriageFilter,
):PublicModerationCaseSummary[]{
  const states=['all','triage','in_review','decision','appeal','closed'];
  const kinds=['all','professional','organization','review','affiliation'];
  if(!filter||!states.includes(filter.state)||!kinds.includes(filter.kind)||
    !isSafeModerationCasePage(data))
    throw new Error('invalid_triage_filter');
  return data.filter(row=>(filter.state==='all'||row.state===filter.state) &&
      (filter.kind==='all'||row.subjectKind===filter.kind));
}

export function summarizeTriageCounts(items:readonly PublicModerationCaseSummary[]){
  if(!isSafeModerationCasePage(items))throw new Error('invalid_moderation_page');
  return {
    visible:items.length,
    triage:items.filter(x=>x.state==='triage').length,
    inReview:items.filter(x=>x.state==='in_review').length,
    appeal:items.filter(x=>x.state==='appeal').length,
  };
}
