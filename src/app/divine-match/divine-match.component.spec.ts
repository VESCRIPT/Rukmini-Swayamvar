import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DivineMatchComponent } from './divine-match.component';

describe('DivineMatchComponent', () => {
  let component: DivineMatchComponent;
  let fixture: ComponentFixture<DivineMatchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DivineMatchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DivineMatchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
