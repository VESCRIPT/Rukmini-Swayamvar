import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewState } from '../types';

@Component({
  selector: 'app-privacy-settings',
  imports: [CommonModule],
  templateUrl: './privacy-settings.component.html',
  styleUrl: './privacy-settings.component.css'
})
export class PrivacySettingsComponent {
  @Output() viewChange = new EventEmitter<ViewState>();

  // Profile Visibility
  profileVisibility: boolean = true;

  // Show Contact Information
  showContactInfo: boolean = false;

  // Show Contact Information (second one - seems like location/address)
  showContactDetails: boolean = true;

  // Show Photos to Premium Cert
  showPhotosToPremiumCert: boolean = true;

  // Show Photo to Premium Users
  showPhotoToPremiumUsers: boolean = false;

  toggleProfileVisibility() {
    this.profileVisibility = !this.profileVisibility;
  }

  toggleShowContactInfo() {
    this.showContactInfo = !this.showContactInfo;
  }

  toggleShowContactDetails() {
    this.showContactDetails = !this.showContactDetails;
  }

  toggleShowPhotosToPremiumCert() {
    this.showPhotosToPremiumCert = !this.showPhotosToPremiumCert;
  }

  toggleShowPhotoToPremiumUsers() {
    this.showPhotoToPremiumUsers = !this.showPhotoToPremiumUsers;
  }

  goBack() {
    this.viewChange.emit('settings');
  }
}
