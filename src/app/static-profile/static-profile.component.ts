import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface StaticProfileItem {
  id: string;
  name: string;
  image: string;
  caste: string;
  maritalStatus: string;
  birthDate: string;
  profession: string;
  position?: string;
}

@Component({
  selector: 'app-static-profile',
  imports: [CommonModule],
  templateUrl: './static-profile.component.html',
  styleUrl: './static-profile.component.css'
})
export class StaticProfileComponent implements AfterViewInit {

  activeCardIndex = 0;

  profiles: StaticProfileItem[] = [
    {
      id: '5J8OUHNZ',
      name: 'Priya Sharma',
      image: 'https://www.bringitonline.in/uploads/2/2/4/5/22456530/professional-modelling-portfolio-photoshoot-36-orig_orig.jpg',
      caste: 'Brahmin',
      maritalStatus: 'Single',
      birthDate: '19-12-1996',
      profession: 'Software Professional'
    },
    {
      id: 'MK87YHN2',
      name: 'Rahul Mishra',
      image: 'https://www.bringitonline.in/uploads/2/2/4/5/22456530/kurta-vest-photoshoot-mens-ethnic-wear-photoshoot-traditional-dress-poses-for-man-mens-ethnic-wear-for-wedding-traditional-indian-mens-clothing-bringitonline_orig.jpeg',
      caste: 'Kshatriya',
      maritalStatus: 'Single',
      birthDate: '28-05-1994',
      profession: 'Project Manager',
      position: 'top'
    },
    {
      id: 'XA0G7N1L',
      name: 'Arnav Joshi',
      image: 'https://www.bringitonline.in/uploads/2/2/4/5/22456530/fashion-modelling-portfolio-photography-3-orig_orig.jpg',
      caste: 'Brahmin',
      maritalStatus: 'Single',
      birthDate: '30-11-2001',
      profession: 'Electronics Engineer'
    },
    {
      id: 'PL09VQXW',
      name: 'Amit Verma',
      image: 'https://www.bringitonline.in/uploads/2/2/4/5/22456530/high-quality-matrimonial-portfolio-photography-25_1.jpg',
      caste: 'Maratha',
      maritalStatus: 'Single',
      birthDate: '12-10-1993',
      profession: 'Business Analyst'
    },
    {
      id: 'QT9R2N3M',
      name: 'Anjali Patil',
      image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400',
      caste: 'Vaishya',
      maritalStatus: 'Single',
      birthDate: '15-08-1995',
      profession: 'Doctor'
    },
    {
      id: 'BV7K1L9X',
      name: 'Vikram Singh',
      image: 'https://www.bringitonline.in/uploads/2/2/4/5/22456530/portfolio-shoot-in-delhi-bringitonline-orig-orig_orig.jpg',
      caste: 'Brahmin',
      maritalStatus: 'Single',
      birthDate: '22-03-1992',
      profession: 'Software Engineer'
    },
    {
      id: 'NM4H8G2Q',
      name: 'Kavya Rao',
      image: 'https://www.bringitonline.in/uploads/2/2/4/5/22456530/female-corporate-with-table-photo-corporate-photographers-in-delhi-corporate-photography-in-delhi-ncr-best-corporate-photography-services-in-delhi-corporate-photography-bringitonline-orig_orig.jpeg',
      caste: 'Kshatriya',
      maritalStatus: 'Single',
      birthDate: '10-11-1997',
      profession: 'Teacher'
    },
    {
      id: 'LP6W3E5R',
      name: 'Rohit More',
      image: 'https://www.bringitonline.in/uploads/2/2/4/5/22456530/corporate-photoshoot-in-delhi-ncr-bring-it-online-orig_orig.jpeg',
      caste: 'Maratha',
      maritalStatus: 'Single',
      birthDate: '05-06-1994',
      profession: 'Business Analyst'
    }
  ];

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  ngAfterViewInit() {
    this.addScrollListeners();
  }

  addScrollListeners() {
    const container = this.scrollContainer.nativeElement;

    // Add wheel event for horizontal scrolling
    container.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();

      // Check if shift key is pressed for natural horizontal scrolling
      if (e.shiftKey) {
        container.scrollLeft += e.deltaX;
      } else {
        // Vertical scroll converts to horizontal scroll
        container.scrollLeft += e.deltaY;
      }
      this.updateActiveCard();
    }, { passive: false });

    // Add touch events for mobile support
    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    container.addEventListener('mousedown', (e: MouseEvent) => {
      isDown = true;
      container.style.cursor = 'grabbing';
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });

    container.addEventListener('mouseleave', () => {
      isDown = false;
      container.style.cursor = 'grab';
    });

    container.addEventListener('mouseup', () => {
      isDown = false;
      container.style.cursor = 'grab';
      this.updateActiveCard();
    });

    container.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2;
      container.scrollLeft = scrollLeft - walk;
    });

    // Add scroll event listener to update active card
    container.addEventListener('scroll', () => {
      this.updateActiveCard();
    });
  }

  updateActiveCard() {
    const container = this.scrollContainer.nativeElement;
    const cardWidth = 288; // 280px + 8px gap
    const scrollPosition = container.scrollLeft;
    const newActiveIndex = Math.round(scrollPosition / cardWidth);

    if (newActiveIndex !== this.activeCardIndex && newActiveIndex >= 0 && newActiveIndex < this.profiles.length) {
      this.activeCardIndex = newActiveIndex;
    }
  }

  scrollLeft() {
    this.scrollContainer.nativeElement.scrollBy({
      left: -320,
      behavior: 'smooth'
    });
  }

  scrollRight() {
    this.scrollContainer.nativeElement.scrollBy({
      left: 320,
      behavior: 'smooth'
    });
  }

  scrollToCard(index: number) {
    const container = this.scrollContainer.nativeElement;
    const cardWidth = 288; // 280px + 8px gap
    const scrollPosition = index * cardWidth;

    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });

    this.activeCardIndex = index;
  }

  trackByFn(index: number, profile: StaticProfileItem) {
    return profile.id;
  }
}
