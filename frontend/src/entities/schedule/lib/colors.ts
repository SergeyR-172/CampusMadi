export type SubjectKind = "lab" | "seminar" | "lecture";

export const subjectKindLabel: Record<SubjectKind, string> = {
  lab: "Лабораторные занятия",
  seminar: "Практические занятия",
  lecture: "Лекционные занятия",
};

export const subjectKindColor: Record<SubjectKind, string> = {
  lab: "var(--color-subject-lab)",
  seminar: "var(--color-subject-seminar)",
  lecture: "var(--color-subject-lecture)",
};

const KINDS: SubjectKind[] = ["lab", "seminar", "lecture"];

const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

/**
 * Backend's `ScheduleItemOut` has no explicit pair-type field, so this
 * derives a stable kind from the subject name. Same subject always maps
 * to the same color so the legend stays meaningful.
 */
export const getSubjectKind = (subject: string): SubjectKind =>
  KINDS[hashString(subject) % KINDS.length];
