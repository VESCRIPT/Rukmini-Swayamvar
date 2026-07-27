import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaticProfileComponent } from './static-profile.component';

describe('StaticProfileComponent', () => {
  let component: StaticProfileComponent;
  let fixture: ComponentFixture<StaticProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaticProfileComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaticProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
