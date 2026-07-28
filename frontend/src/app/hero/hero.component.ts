import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ViewState } from '../types';

import { QrCodeComponent } from '../qr-code/qr-code.component';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage, QrCodeComponent],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroComponent implements OnInit, OnDestroy {
  @Input() t!: any;
  @Output() viewChange = new EventEmitter<ViewState>();

  /** Hero slides served from src/assets (JPG with optional WebP). */
  readonly heroSlides: readonly { jpg: string; webp?: string; width: number; height: number }[] = [
    { jpg: '/assets/images/m1.jpg', width: 735, height: 917 },
    { jpg: '/assets/images/m2.jpg', width: 736, height: 920 },
    { jpg: '/assets/images/m3.jpg', width: 736, height: 1104 }
  ];

  currentHeroIndex = 0;
  private sliderInterval: ReturnType<typeof setInterval> | undefined;

  constructor(private cdr: ChangeDetectorRef) { }

  setView(view: ViewState) {
    this.viewChange.emit(view);
  }

  trackSlide(_index: number, slide: { jpg: string }): string {
    return slide.jpg;
  }

  ngOnInit(): void {
    this.preloadSecondarySlidesWhenIdle();
    requestAnimationFrame(() => this.startSlider());
  }

  /** Warm slides 2–5 after idle so the carousel does not compete with first paint / LCP. */
  private preloadSecondarySlidesWhenIdle(): void {
    const run = () => {
      for (let i = 1; i < this.heroSlides.length; i++) {
        const img = new Image();
        img.src = this.heroSlides[i].webp ?? this.heroSlides[i].jpg;
      }
    };
    const w = globalThis as typeof globalThis & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 2500);
    }
  }

  startSlider() {
    this.sliderInterval = setInterval(() => {
      this.currentHeroIndex = (this.currentHeroIndex + 1) % this.heroSlides.length;
      this.cdr.markForCheck();
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
    }
  }
}
