import { calculateComplexity } from './breath-session-complexity.calculator';
import { BreathExercise } from '../entities/breath-session.entity';

describe('calculateComplexity', () => {
  it('should return 0 for empty exercises array', () => {
    expect(calculateComplexity([])).toBe(0);
  });

  it('should return cycleDuration * repeatCount for a single exercise with no rest', () => {
    const exercises: BreathExercise[] = [
      {
        steps: [
          { type: 'inhale', duration: 4000 },
          { type: 'exhale', duration: 4000 },
        ],
        restDuration: 0,
        repeatCount: 3,
      },
    ];
    // contribution = (4000 + 4000) * 3 = 24000
    expect(calculateComplexity(exercises)).toBe(24000);
  });

  it('should not penalise a rest separator at index 0', () => {
    const exercises: BreathExercise[] = [
      { steps: [], restDuration: 5000, repeatCount: 1 }, // index 0 — no penalty
      {
        steps: [{ type: 'inhale', duration: 4000 }],
        restDuration: 0,
        repeatCount: 2,
      },
    ];
    // contribution = 4000 * 2 = 8000, penalty = 0
    expect(calculateComplexity(exercises)).toBe(8000);
  });

  it('should apply between-exercise rest penalty for rest separator at index > 0', () => {
    const exercises: BreathExercise[] = [
      {
        steps: [{ type: 'inhale', duration: 4000 }],
        restDuration: 0,
        repeatCount: 2,
      },
      { steps: [], restDuration: 3000, repeatCount: 1 }, // index 1 — penalty = 3000 * 3
    ];
    // contribution = 4000 * 2 = 8000, penalty = 9000 → clamped to 0
    expect(calculateComplexity(exercises)).toBe(0);
  });

  it('should apply between-set rest penalty for exercise with restDuration > 0', () => {
    const exercises: BreathExercise[] = [
      {
        steps: [
          { type: 'inhale', duration: 4000 },
          { type: 'hold', duration: 2000 },
          { type: 'exhale', duration: 4000 },
        ],
        restDuration: 1000,
        repeatCount: 4,
      },
    ];
    // contribution = (4000 + 2000 + 4000) * 4 = 40000
    // penalty = 1000 * 4 * 5 = 20000
    expect(calculateComplexity(exercises)).toBe(20000);
  });

  it('should handle high-intensity exercise where contribution dominates', () => {
    const exercises: BreathExercise[] = [
      {
        steps: [
          { type: 'inhale', duration: 60000 },
          { type: 'exhale', duration: 60000 },
        ],
        restDuration: 2000,
        repeatCount: 3,
      },
    ];
    // contribution = 120000 * 3 = 360000
    // penalty = 2000 * 3 * 5 = 30000
    expect(calculateComplexity(exercises)).toBe(330000);
  });

  it('should clamp to 0 when penalty exceeds contribution', () => {
    const exercises: BreathExercise[] = [
      {
        steps: [{ type: 'inhale', duration: 1000 }],
        restDuration: 5000,
        repeatCount: 2,
      },
    ];
    // contribution = 1000 * 2 = 2000
    // penalty = 5000 * 2 * 5 = 50000
    expect(calculateComplexity(exercises)).toBe(0);
  });

  it('should handle mixed: opening rest + inter-exercise rest + between-set rest', () => {
    const exercises: BreathExercise[] = [
      { steps: [], restDuration: 5000, repeatCount: 1 },  // index 0 — no penalty
      {
        steps: [
          { type: 'inhale', duration: 4000 },
          { type: 'exhale', duration: 4000 },
        ],
        restDuration: 1000,
        repeatCount: 3,
      },
      { steps: [], restDuration: 2000, repeatCount: 1 },  // index 2 — penalty = 2000 * 3
      {
        steps: [{ type: 'inhale', duration: 3000 }],
        restDuration: 0,
        repeatCount: 2,
      },
    ];
    // contribution = (4000+4000)*3 + 3000*2 = 24000 + 6000 = 30000
    // penalty = 1000*3*5 (between-set) + 2000*3 (inter-exercise) = 15000 + 6000 = 21000
    expect(calculateComplexity(exercises)).toBe(9000);
  });
});
