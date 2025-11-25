/**
 * Spaced Repetition Types
 */

export interface KnowledgeCard {
  id: string;
  space_id: string;
  front: string;
  back: string;
  deck: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review: number;
  created_at: number;
  updated_at: number;
}

export interface ReviewSession {
  card: KnowledgeCard;
  rating: ReviewRating;
  reviewed_at: number;
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface DeckStats {
  deck: string;
  total: number;
  due: number;
  new: number;
  learning: number;
  review: number;
}

export const ratingColors: Record<ReviewRating, string> = {
  again: 'red',
  hard: 'orange',
  good: 'green',
  easy: 'blue',
};

export const ratingLabels: Record<ReviewRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

