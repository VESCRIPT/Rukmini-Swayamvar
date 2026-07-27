import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-how-works',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './how-works.component.html',
  styleUrl: './how-works.component.css'
})
export class HowWorksComponent implements AfterViewInit, OnDestroy {
  @Input() t: any;
  @ViewChild('howWorksSection', { static: true }) howWorksSection?: ElementRef<HTMLElement>;
  private ctx?: gsap.Context;

  ngAfterViewInit(): void {
    if (!this.howWorksSection?.nativeElement) return;

    gsap.registerPlugin(ScrollTrigger);

    this.ctx = gsap.context(() => {
      gsap.from('.how-works-heading', {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: this.howWorksSection?.nativeElement,
          start: 'top 78%',
          once: true
        }
      });

      gsap.from('.flow-svg', {
        opacity: 0,
        scale: 0.98,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: this.howWorksSection?.nativeElement,
          start: 'top 72%',
          once: true
        }
      });

      const stepCards = gsap.utils.toArray<HTMLElement>('.how-step-card');
      gsap.set(stepCards, { autoAlpha: 0, y: 55 });

      const stepTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: this.howWorksSection?.nativeElement,
          start: 'top 68%',
          once: true
        }
      });

      stepCards.forEach((card, index) => {
        stepTimeline.to(
          card,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out'
          },
          index === 0 ? 0 : '+=0.35'
        );
      });
    }, this.howWorksSection.nativeElement);
  }

  ngOnDestroy(): void {
    this.ctx?.revert();
  }
}
