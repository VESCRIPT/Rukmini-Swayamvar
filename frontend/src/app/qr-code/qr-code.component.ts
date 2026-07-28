import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Landing URL for app download (encoded in public/store/app-download-qr.png). */
const APP_DOWNLOAD_URL = 'https://rukminiswayamvar.com';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-code.component.html',
  styleUrl: './qr-code.component.css'
})
export class QrCodeComponent {
  readonly downloadUrl = APP_DOWNLOAD_URL;
  /** Pre-generated at build time — see tools/generate-app-qr.cjs */
  readonly qrImageSrc = '/store/app-download-qr.png';
}
