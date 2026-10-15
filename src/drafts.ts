import { CURRENT_DRAFT_KEY, DRAFT_KEY, isCalculusLesson, isStatisticsLesson, isProbabilityLesson, parseStoredLesson } from './lesson.ts';
import type { AnyLesson } from './lesson.ts';

export type Topic = 'linear' | 'calculus' | 'statistics' | 'probability';
type DraftStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function lessonTopic(lesson: AnyLesson): Topic {
  return isProbabilityLesson(lesson) ? 'probability' : isStatisticsLesson(lesson) ? 'statistics' : isCalculusLesson(lesson) ? 'calculus' : 'linear';
}
export const topicDraftKey = (topic: Topic) => `lessonline-draft-${topic}-v2`;
// Object property order can differ after validation/restoration; it is not an edit.
export function draftSnapshot(lesson: AnyLesson): string {
  return JSON.stringify(lesson, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
}
export function readTopicDraft(storage: DraftStorage, topic: Topic): AnyLesson | null {
  for (const key of [topicDraftKey(topic), CURRENT_DRAFT_KEY, ...(topic === 'linear' ? [DRAFT_KEY] : [])]) {
    const raw = storage.getItem(key);
    const lesson = raw ? parseStoredLesson(raw) : null;
    if (lesson && lessonTopic(lesson) === topic) return lesson;
  }
  return null;
}
export function saveTopicDraft(storage: DraftStorage, lesson: AnyLesson): string {
  // Preserve the prior current slot when migrating to one saved draft per topic.
  const raw = storage.getItem(CURRENT_DRAFT_KEY);
  const previous = raw ? parseStoredLesson(raw) : null;
  if (previous && lessonTopic(previous) !== lessonTopic(lesson)) {
    const key = topicDraftKey(lessonTopic(previous));
    if (!storage.getItem(key)) storage.setItem(key, JSON.stringify(previous));
  }
  const snapshot = draftSnapshot(lesson);
  storage.setItem(topicDraftKey(lessonTopic(lesson)), snapshot);
  storage.setItem(CURRENT_DRAFT_KEY, snapshot);
  return snapshot;
}
