import { BreathExercise } from '../entities/breath-session.entity';

export function calculateComplexity(exercises: BreathExercise[]): number {
  let contribution = 0;
  let penalty = 0;

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const isRestSeparator = ex.steps.length === 0;

    if (isRestSeparator) {
      if (i > 0) penalty += ex.restDuration * 3;
    } else {
      const cycleDuration = ex.steps.reduce((s, step) => s + step.duration, 0);
      contribution += cycleDuration * ex.repeatCount;
      if (ex.restDuration > 0) {
        penalty += ex.restDuration * ex.repeatCount * 5;
      }
    }
  }

  return Math.max(0, contribution - penalty);
}
