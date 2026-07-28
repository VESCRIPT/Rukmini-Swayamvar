import { Injectable } from '@angular/core';
import {
  CommunityEvent,
  TeachingArticle,
  TeachingCategory,
  TeachingCategoryCard,
  coverGradientForCategory,
  coverLabelForCategory,
  fromApiEventCategory,
  fromApiTeachingCategory,
  normalizeRsvpStatus,
  teachingCoverGradient,
  teachingCoverLabel
} from './community.models';
import { TEACHING_CATEGORY_CARDS } from './community-data';

@Injectable({ providedIn: 'root' })
export class CommunityService {
  getTeachingCategories(): TeachingCategoryCard[] {
    return TEACHING_CATEGORY_CARDS;
  }

  mapApiEvent(raw: any): CommunityEvent {
    const category = fromApiEventCategory(String(raw?.category || 'marriage_meetup'));
    const city = String(raw?.city || '').trim();
    const state = String(raw?.state || '').trim();
    const venue = String(raw?.venueName || raw?.venue || '').trim();
    const cityStateParts = [venue, [city, state].filter(Boolean).join(', ')].filter(Boolean);

    const startAt = this.normalizeApiDate(raw?.eventStartAt || raw?.startAt || '');
    const endAt = this.normalizeApiDate(raw?.eventEndAt || raw?.endAt || '');
    const publishedAt = this.normalizeApiDate(raw?.publishedAt || raw?.createdAt || '');

    return {
      id: String(raw?.id ?? raw?.eventId ?? ''),
      category,
      title: String(raw?.title || 'Community Event'),
      coverGradient: coverGradientForCategory(category),
      coverImageUrl: String(raw?.coverImageUrl || '').trim(),
      coverLabel: coverLabelForCategory(category),
      startAt,
      endAt,
      venue: venue || 'Venue TBA',
      addressLine1: String(raw?.address || raw?.addressLine1 || '').trim(),
      cityState: cityStateParts.join(' · ') || [city, state].filter(Boolean).join(', '),
      description: String(raw?.description || '').trim(),
      capacity: Number(raw?.maxAttendees ?? raw?.capacity ?? 0) || 0,
      goingCount: Number(raw?.goingCount ?? 0) || 0,
      interestedCount: Number(raw?.interestedCount ?? 0) || 0,
      publishedAt: publishedAt ? publishedAt.slice(0, 10) : '',
      isPast: this.isEventPast(endAt || startAt),
      myRsvpStatus: normalizeRsvpStatus(raw?.myRsvpStatus)
    };
  }

  mapApiTeaching(raw: any): TeachingArticle {
    const category = fromApiTeachingCategory(String(raw?.category || 'history'));
    const updatedRaw = this.normalizeApiDate(raw?.updatedAt || raw?.publishedAt || raw?.createdAt || '');
    return {
      id: String(raw?.id ?? raw?.articleId ?? ''),
      category,
      slug: String(raw?.slug || '').trim(),
      title: String(raw?.title || 'Teaching'),
      summary: String(raw?.excerpt || raw?.summary || '').trim(),
      body: String(raw?.body || '').replace(/\\n/g, '\n').trim(),
      coverGradient: teachingCoverGradient(category),
      coverImageUrl: String(raw?.coverImageUrl || '').trim(),
      coverLabel: teachingCoverLabel(category),
      featured: !!(raw?.isFeatured ?? raw?.featured),
      updatedAt: updatedRaw ? updatedRaw.slice(0, 10) : '',
      sortOrder: Number(raw?.sortOrder ?? 0) || 0
    };
  }

  extractEventsList(response: any): any[] {
    if (!response || typeof response !== 'object') return [];
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.events)) return response.events;
    if (Array.isArray(response.data?.events)) return response.data.events;
    if (Array.isArray(response.data?.list)) return response.data.list;
    return [];
  }

  extractTeachingsList(response: any): any[] {
    if (!response || typeof response !== 'object') return [];
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.articles)) return response.articles;
    if (Array.isArray(response.data?.articles)) return response.data.articles;
    if (Array.isArray(response.data?.list)) return response.data.list;
    return [];
  }

  extractEventDetail(response: any): any | null {
    if (!response || typeof response !== 'object') return null;
    return response.event || response.data?.event || response.data || null;
  }

  extractTeachingDetail(response: any): any | null {
    if (!response || typeof response !== 'object') return null;
    return response.article || response.data?.article || response.data || null;
  }

  splitArticleBody(body: string): string[] {
    return String(body || '')
      .replace(/\\n/g, '\n')
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  formatEventDate(value: string): string {
    const d = this.parseDate(value);
    if (!d) return value || '';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  formatShortDate(value: string): string {
    return this.formatEventDate(value);
  }

  private normalizeApiDate(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) return '';
    return raw.includes('T') ? raw : raw.replace(' ', 'T');
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private isEventPast(endOrStart: string): boolean {
    const d = this.parseDate(endOrStart);
    if (!d) return false;
    return d.getTime() < Date.now();
  }
}
