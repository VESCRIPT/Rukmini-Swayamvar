export type EventCategory = 'marriage' | 'religious';
export type EventApiCategory = 'marriage_meetup' | 'religious_gathering';
export type EventTimeFilter = 'upcoming' | 'past';
export type RsvpStatus = 'none' | 'going' | 'interested';
export type TeachingCategory = 'history' | 'traditions' | 'marriage-guidelines';
export type TeachingApiCategory = 'history' | 'traditions' | 'marriage_guidelines';

export interface CommunityEvent {
  id: string;
  category: EventCategory;
  title: string;
  coverGradient: string;
  coverImageUrl: string;
  coverLabel: string;
  startAt: string;
  endAt: string;
  venue: string;
  addressLine1: string;
  cityState: string;
  description: string;
  capacity: number;
  goingCount: number;
  interestedCount: number;
  publishedAt: string;
  isPast: boolean;
  myRsvpStatus?: RsvpStatus;
}

export interface TeachingArticle {
  id: string;
  category: TeachingCategory;
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverGradient: string;
  coverImageUrl: string;
  coverLabel: string;
  featured: boolean;
  updatedAt: string;
  sortOrder: number;
}

export interface TeachingCategoryCard {
  id: TeachingCategory;
  title: string;
  subtitle: string;
  gradient: string;
  icon: 'history' | 'traditions' | 'guidelines';
}

export function toApiEventCategory(category: EventCategory): EventApiCategory {
  return category === 'religious' ? 'religious_gathering' : 'marriage_meetup';
}

export function fromApiEventCategory(category: string): EventCategory {
  return category === 'religious_gathering' ? 'religious' : 'marriage';
}

export function coverLabelForCategory(category: EventCategory): string {
  return category === 'religious' ? 'Religious Gathering' : 'Marriage Meetup';
}

export function coverGradientForCategory(category: EventCategory): string {
  return category === 'religious'
    ? 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 45%, #ffcc80 100%)'
    : 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 40%, #f48fb1 100%)';
}

export function normalizeRsvpStatus(value: unknown): RsvpStatus {
  const status = String(value || '').toLowerCase().trim();
  if (status === 'going') return 'going';
  if (status === 'interested') return 'interested';
  return 'none';
}

export function toApiTeachingCategory(category: TeachingCategory): TeachingApiCategory {
  if (category === 'marriage-guidelines') return 'marriage_guidelines';
  if (category === 'traditions') return 'traditions';
  return 'history';
}

export function fromApiTeachingCategory(category: string): TeachingCategory {
  const value = String(category || '').toLowerCase().trim();
  if (value === 'marriage_guidelines' || value === 'marriage-guidelines') {
    return 'marriage-guidelines';
  }
  if (value === 'traditions') return 'traditions';
  return 'history';
}

export function teachingCoverLabel(category: TeachingCategory): string {
  if (category === 'marriage-guidelines') return 'Marriage Guidelines';
  if (category === 'traditions') return 'Traditions';
  return 'History';
}

export function teachingCoverGradient(category: TeachingCategory): string {
  if (category === 'marriage-guidelines') {
    return 'linear-gradient(135deg, #004d40 0%, #00796b 40%, #4db6ac 100%)';
  }
  if (category === 'traditions') {
    return 'linear-gradient(135deg, #bf360c 0%, #e65100 40%, #ffcc80 100%)';
  }
  return 'linear-gradient(135deg, #5d4037 0%, #8d6e63 40%, #d7ccc8 100%)';
}
