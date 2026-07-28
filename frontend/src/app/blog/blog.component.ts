import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string[];
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  featured?: boolean;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog.component.html',
  styleUrl: './blog.component.css'
})
export class BlogComponent {
  @Output() viewChange = new EventEmitter<string>();
  @Input() origin: string | null = null;

  selectedPost: BlogPost | null = null;
  activeCategory = 'All';

  readonly categories = [
    'All',
    'Guidance',
    'Profiles',
    'Wedding',
    'Family',
    'Community'
  ];

  readonly posts: BlogPost[] = [
    {
      id: 'finding-life-partner',
      title: 'How to choose a life partner with clarity and calm',
      excerpt:
        'A thoughtful guide to matching on values, lifestyle, and family harmony — beyond photos and first impressions.',
      content: [
        'Choosing a life partner is one of the most meaningful decisions you will make. In the Mahanubhav tradition, marriage is not only a personal bond — it is a sacred responsibility rooted in shared values, respect, and spiritual alignment.',
        'Start with clarity about your own lifestyle. Vegetarian habits, family expectations, spiritual practice, and long-term goals matter more than surface-level filters. When both families understand each other’s priorities early, conversations stay warm and honest.',
        'On Rukmini Swayamvar, take time to complete your profile carefully. A clear biodata, genuine photos, and a sincere “about me” section help the right families find you — and help you recognise compatibility with confidence.',
        'Speak with patience. Ask about daily routines, career plans, and family roles. Compatibility grows when both sides feel heard. Trust your judgment, involve elders wisely, and move forward only when your heart and values agree.'
      ],
      category: 'Guidance',
      author: 'Rukmini Editorial',
      date: '12 June 2026',
      readTime: '4 min read',
      image: '/assets/images/m1.jpg',
      featured: true
    },
    {
      id: 'biodata-that-stands-out',
      title: 'Write a biodata that feels warm, clear, and trustworthy',
      excerpt:
        'Simple writing tips so your profile reflects who you are — your values, education, and family background.',
      content: [
        'A strong biodata does not need fancy language. It needs honesty, warmth, and structure. Families often decide whether to connect based on how clearly your story is told.',
        'Open with who you are: education, profession, city, and family setup. Then share what matters to you in a partner — values, lifestyle, and the kind of home you wish to build together.',
        'Avoid exaggeration. Prefer specific, respectful details: “I enjoy temple seva with my family” lands better than vague claims. Keep paragraphs short so busy readers can scan quickly.',
        'Finally, review photos and contact preferences. A complete, tidy profile signals sincerity — and that sincerity is what invites meaningful responses.'
      ],
      category: 'Profiles',
      author: 'Rukmini Editorial',
      date: '5 June 2026',
      readTime: '3 min read',
      image: '/assets/images/m2.jpg'
    },
    {
      id: 'family-first-conversations',
      title: 'Family-first conversations that build trust early',
      excerpt:
        'How to involve parents and elders gracefully while keeping the match process respectful for both sides.',
      content: [
        'In community marriages, family involvement is a strength when handled with care. Early conversations set the tone for trust between both homes.',
        'Begin with introductions that feel personal, not transactional. Share what you admire about your family culture, seva practices, and daily life. Invite questions without pressure.',
        'Discuss practical topics calmly: location preferences, career timelines, and living arrangements. Clarity prevents misunderstandings later.',
        'Remember: both families are seeking peace of mind. Courtesy, punctuality in replies, and transparent communication turn a match enquiry into a relationship of respect.'
      ],
      category: 'Family',
      author: 'Rukmini Editorial',
      date: '28 May 2026',
      readTime: '3 min read',
      image: '/assets/images/m3.jpg'
    },
    {
      id: 'wedding-rituals-meaning',
      title: 'Wedding rituals with meaning — not just moments',
      excerpt:
        'A gentle look at traditional ceremonies and how couples can keep devotion at the centre of celebration.',
      content: [
        'A wedding is a celebration, but in our tradition it is also a vow. Rituals carry meaning when families understand why each step is performed.',
        'Take time to explain customs to younger relatives and guests. When everyone knows the spirit behind a ceremony, the day feels united rather than rushed.',
        'Choose simplicity where it serves devotion. Elegant attire, sincere hospitality, and mindful music often create a warmer memory than excess.',
        'Above all, keep the couple’s blessing and family harmony at the centre. A wedding remembered for its grace becomes a foundation for married life.'
      ],
      category: 'Wedding',
      author: 'Rukmini Editorial',
      date: '18 May 2026',
      readTime: '4 min read',
      image: '/assets/images/m1.jpg'
    },
    {
      id: 'safe-matching-online',
      title: 'Stay safe while matching online — practical checklist',
      excerpt:
        'Privacy, verification, and healthy boundaries so your matrimonial journey stays secure and respectful.',
      content: [
        'Online matching is convenient, but safety deserves the same attention as compatibility. Protect your personal information while you explore genuine connections.',
        'Share sensitive details only after mutual interest is clear. Prefer in-app messaging first. Meet in public places with family awareness when you decide to meet offline.',
        'Use platform tools: report suspicious behaviour, keep photos appropriate, and verify profiles carefully. A respectful match will never pressure you to rush.',
        'Your peace of mind matters. A careful pace is not hesitation — it is wisdom that protects your future home.'
      ],
      category: 'Guidance',
      author: 'Rukmini Editorial',
      date: '8 May 2026',
      readTime: '3 min read',
      image: '/assets/images/m2.jpg'
    },
    {
      id: 'community-values-marriage',
      title: 'Why shared community values strengthen marriage',
      excerpt:
        'Faith, vegetarian lifestyle, and cultural roots — how shared foundations support lifelong companionship.',
      content: [
        'Shared community values give a marriage a common language. Festivals, food habits, seva, and spiritual rhythm become easier when both partners already understand them.',
        'Rukmini Swayamvar exists to honour that foundation for the Mahanubhav Panth community — helping families meet with cultural familiarity and mutual respect.',
        'Values do not replace personal chemistry; they support it. When daily life aligns, couples spend less energy negotiating basics and more energy building affection.',
        'Seek a partner who shares your roots and respects your individuality. That balance — tradition with understanding — is where lasting homes are built.'
      ],
      category: 'Community',
      author: 'Rukmini Editorial',
      date: '1 May 2026',
      readTime: '4 min read',
      image: '/assets/images/m3.jpg'
    }
  ];

  get featuredPost(): BlogPost | null {
    if (this.activeCategory !== 'All') return null;
    return this.posts.find((p) => p.featured) ?? this.posts[0] ?? null;
  }

  get visiblePosts(): BlogPost[] {
    const filtered =
      this.activeCategory === 'All'
        ? this.posts
        : this.posts.filter((p) => p.category === this.activeCategory);

    const featuredId = this.featuredPost?.id;
    if (featuredId && this.activeCategory === 'All') {
      return filtered.filter((p) => p.id !== featuredId);
    }
    return filtered;
  }

  setCategory(category: string): void {
    this.activeCategory = category;
  }

  onCardImageError(post: BlogPost): void {
    post.image = '';
  }

  openPost(post: BlogPost): void {
    this.selectedPost = post;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closePost(): void {
    this.selectedPost = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack(): void {
    if (this.selectedPost) {
      this.closePost();
      return;
    }
    if (this.origin === 'settings') {
      this.viewChange.emit('settings');
    } else {
      this.viewChange.emit('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
