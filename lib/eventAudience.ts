import { AppEvent, SchoolNode, UserProfile } from '../types';
import { findNodePath, flattenDirectory } from './academicDirectory';

export function isEventRecipient(event: AppEvent, profile: UserProfile, roots: SchoolNode[]): boolean {
  const assignment = profile.school_data.academic_assignment;
  const pathIds = new Set([
    ...(assignment?.nodePathIds || []),
    ...(findNodePath(roots, assignment?.terminalGroupId || '') || []).map(node => node.id),
    ...(profile.official_data?.assignment_node_path_ids || []),
  ]);
  if (event.scopeNodeId && !pathIds.has(event.scopeNodeId)) return false;
  const audience = event.audienceTarget;
  if (audience?.mode === 'specific_people') return Boolean(audience.specificUserIds?.includes(profile.uid));
  if (audience?.mode === 'directory_node') return audience.includeDescendants === false
    ? assignment?.terminalGroupId === audience.nodeId
    : pathIds.has(audience.nodeId || '');
  const groups = audience?.groups || event.recipientGroups;
  if (groups?.length) return groups.some(group => {
    if (group === 'All Students') return ['student', 'mayor', 'ssg'].includes(profile.role);
    if (group === 'All SSG Officers') return profile.role === 'ssg';
    if (group === 'All Mayors') return profile.role === 'mayor';
    if (group.startsWith('person:')) return group.slice(7) === profile.uid;
    if (group.startsWith('node:')) return pathIds.has(group.slice(5));
    const names = { JHS: 'Junior High School', SHS: 'Senior High School', College: 'College' };
    const name = names[group as keyof typeof names] || group;
    return flattenDirectory(roots).some(node => node.name === name && pathIds.has(node.id))
      || Object.values(profile.school_data).some(value => value === name);
  });
  if (audience?.mode === 'all' || event.target?.all || event.participantsType === 'all') return true;
  if (event.specificParticipants?.includes(profile.uid)) return true;
  const values = [event.targetValue, ...(event.target?.department || []), ...(event.target?.section || []), ...(event.target?.strand || [])].filter(Boolean);
  return values.some(value => Object.values(profile.school_data).includes(value));
}
