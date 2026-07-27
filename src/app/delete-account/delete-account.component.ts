import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../types';

@Component({
    selector: 'app-delete-account',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './delete-account.component.html',
    styleUrl: './delete-account.component.css'
})
export class DeleteAccountComponent {
    @Input() t: any;
    @Input() previousView: ViewState = 'settings';
    @Output() viewChange = new EventEmitter<ViewState>();

    email = '';
    password = '';
    isLoading = false;
    showSuccessPopup = false;
    errorMessage = '';

    private validateEmail(email: string): boolean {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    onDeleteAccount() {
        this.isLoading = true;
        this.errorMessage = '';

        // Show success popup almost immediately
        setTimeout(() => {
            this.isLoading = false;
            this.showSuccessPopup = true;
        }, 300);
    }

    goBack() {
        this.viewChange.emit(this.previousView);
    }

    closePopup() {
        this.showSuccessPopup = false;
        this.viewChange.emit('home');
    }
}
