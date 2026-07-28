import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-help-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './help-center.component.html',
  styleUrls: ['./help-center.component.css']
})
export class HelpCenterComponent implements OnInit {
  @Output() viewChange = new EventEmitter<string>();
  @Input() origin: string | null = null;
  @Input() defaultSubView: 'faq' | 'create' | 'list' | 'detail' = 'faq';

  // View control
  currentSubView: 'faq' | 'create' | 'list' | 'detail' = 'faq';

  // User state
  userId: string | null = null;

  // Loading/Status states
  loading = false;
  submitting = false;
  replySubmitting = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Ticket Form
  subject = '';
  category = 'profile_issue';
  message = '';
  attachmentName = '';
  selectedFile: File | null = null;

  // Tickets List & Pagination
  tickets: any[] = [];
  currentPage = 1;
  pageSize = 10;
  totalTickets = 0;
  totalPages = 1;

  // Ticket Detail & Conversation
  selectedTicket: any = null;
  messages: any[] = [];
  replyMessage = '';

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.userId = this.apiService.getAccountUserId();
    if (this.defaultSubView) {
      this.currentSubView = this.defaultSubView;
    }
    if (this.userId) {
      // Preload user's tickets in the background
      this.loadTickets(1, true);
    }
  }

  goBack() {
    if (this.currentSubView === 'create') {
      this.currentSubView = 'list';
      this.error = null;
      this.successMessage = null;
    } else if (this.currentSubView === 'detail') {
      this.currentSubView = 'list';
      this.error = null;
    } else {
      if (this.origin === 'settings') {
        this.viewChange.emit('settings');
      } else {
        this.viewChange.emit('home');
      }
    }
  }

  changeSubView(view: 'faq' | 'create' | 'list' | 'detail') {
    this.currentSubView = view;
    this.error = null;
    this.successMessage = null;
    if (view === 'list') {
      this.loadTickets(1);
    }
  }

  loadTickets(page: number = 1, silent = false) {
    if (!this.userId) return;
    if (!silent) {
      this.loading = true;
    }
    this.error = null;

    this.apiService.listHelpTickets({
      userId: this.userId,
      page: page,
      limit: this.pageSize
    }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.tickets = res.data || [];
          if (res.pagination) {
            this.currentPage = res.pagination.page || page;
            this.pageSize = res.pagination.limit || this.pageSize;
            this.totalTickets = res.pagination.total || 0;
            this.totalPages = res.pagination.totalPages || 1;
          }
        } else {
          if (!silent) {
            this.error = res.message || 'Failed to load support tickets';
          }
        }
      },
      error: (err) => {
        this.loading = false;
        if (!silent) {
          this.error = err?.error?.message || 'Failed to connect to support service';
        }
      }
    });
  }

  createTicket() {
    if (!this.userId) {
      this.error = 'You must be logged in to submit a ticket';
      return;
    }

    if (!this.subject.trim() || !this.message.trim()) {
      this.error = 'Please fill out all fields';
      return;
    }

    this.submitting = true;
    this.error = null;
    this.successMessage = null;

    this.apiService.createHelpTicket({
      userId: this.userId,
      subject: this.subject.trim(),
      category: this.category,
      message: this.message.trim()
    }).subscribe({
      next: (res) => {
        this.submitting = false;
        if (res.success) {
          this.successMessage = res.message || 'Support ticket submitted successfully';
          this.subject = '';
          this.category = 'profile_issue';
          this.message = '';
          this.attachmentName = '';
          this.selectedFile = null;
          
          // Reload the ticket list
          this.loadTickets(1, true);

          // Redirect to ticket list after a brief delay
          setTimeout(() => {
            this.changeSubView('list');
          }, 1500);
        } else {
          this.error = res.message || 'Failed to submit support ticket';
        }
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message || 'Failed to submit support ticket. Please try again.';
      }
    });
  }

  viewTicketDetails(ticketId: string | number) {
    if (!this.userId) return;

    this.loading = true;
    this.error = null;
    this.selectedTicket = null;
    this.messages = [];
    this.replyMessage = '';

    // Switch view immediately to show loading skeleton/spinner
    this.currentSubView = 'detail';

    this.apiService.getHelpTicketDetail({
      userId: this.userId,
      ticketId: ticketId
    }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.selectedTicket = res.ticket;
          this.messages = res.messages || [];
          // Scroll to bottom of chat list
          setTimeout(() => this.scrollToBottom(), 100);
        } else {
          this.error = res.message || 'Failed to load ticket details';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load ticket details';
      }
    });
  }

  sendReply() {
    if (!this.userId || !this.selectedTicket) return;
    if (!this.replyMessage.trim()) return;

    this.replySubmitting = true;
    this.error = null;

    const currentReplyText = this.replyMessage.trim();

    this.apiService.replyHelpTicket({
      userId: this.userId,
      ticketId: this.selectedTicket.id,
      message: currentReplyText
    }).subscribe({
      next: (res) => {
        this.replySubmitting = false;
        if (res.success) {
          this.replyMessage = '';
          
          // Add the reply to local messages list
          if (res.reply) {
            this.messages.push(res.reply);
          } else {
            // Fallback: reload details
            this.viewTicketDetails(this.selectedTicket.id);
          }
          setTimeout(() => this.scrollToBottom(), 100);
        } else {
          this.error = res.message || 'Failed to send reply';
        }
      },
      error: (err) => {
        this.replySubmitting = false;
        this.error = err?.error?.message || 'Failed to send reply';
      }
    });
  }

  scrollToBottom() {
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'profile_issue': 'Profile Issues',
      'payment_issue': 'Payment & Premium',
      'technical_issue': 'Technical Issues',
      'other': 'Other Queries'
    };
    return labels[category] || category;
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.attachmentName = file.name;
    }
  }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'open') return 'status-open';
    if (s === 'resolved') return 'status-resolved';
    if (s === 'closed') return 'status-closed';
    return 'status-other';
  }
}
