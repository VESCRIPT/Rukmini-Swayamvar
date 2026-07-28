import { TeachingCategoryCard } from './community.models';

export const TEACHING_CATEGORY_CARDS: TeachingCategoryCard[] = [
  {
    id: 'history',
    title: 'History',
    subtitle: 'Origins and heritage',
    gradient: 'linear-gradient(145deg, #ffe0b2 0%, #ffcc80 55%, #ffab40 100%)',
    icon: 'history'
  },
  {
    id: 'traditions',
    title: 'Traditions',
    subtitle: 'Customs and practices',
    gradient: 'linear-gradient(145deg, #e1bee7 0%, #ce93d8 55%, #ba68c8 100%)',
    icon: 'traditions'
  },
  {
    id: 'marriage-guidelines',
    title: 'Marriage Guidelines',
    subtitle: 'Guidance for your journey',
    gradient: 'linear-gradient(145deg, #b2dfdb 0%, #80cbc4 55%, #4db6ac 100%)',
    icon: 'guidelines'
  }
];
