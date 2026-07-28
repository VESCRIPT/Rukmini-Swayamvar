import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViewState } from '../types';
import { backToDashboardView } from '../core/constants/dashboard-sidebar-views';
import { ApiService } from '../services/api.service';
import { normalizeProfileImageUrl } from '../core/utils/profile-image-url';
import { environment } from '../../environments/environment';
import { captureElementToCanvas, downloadCanvasAsPdf } from './biodata-export.lib';

type AccentKey = 'pink' | 'wine' | 'navy' | 'teal' | 'brown';

@Component({
  selector: 'app-biodata-maker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './biodata-maker.component.html',
  styleUrls: ['./biodata-maker.component.css']
})
export class BiodataMakerComponent implements OnInit {
  @Input() previousView: ViewState = 'dashboard';
  @Output() viewChange = new EventEmitter<ViewState>();

  @ViewChild('previewRoot', { read: ElementRef }) previewRoot!: ElementRef<HTMLElement>;

  readonly templates = [
    { id: 1, name: 'Classic Rose' },
    { id: 2, name: 'Royal Garnet' },
    { id: 3, name: 'Ocean Slate' },
    { id: 4, name: 'Forest Crest' },
    { id: 5, name: 'Golden Hour' },
    { id: 6, name: 'Ivory Formal' }
  ];

  readonly accents: { key: AccentKey; color: string }[] = [
    { key: 'pink', color: '#ec407a' },
    { key: 'wine', color: '#8b1538' },
    { key: 'navy', color: '#1a237e' },
    { key: 'teal', color: '#00695c' },
    { key: 'brown', color: '#5d4037' }
  ];

  selectedTemplate = 1;
  accentKey: AccentKey = 'pink';
  profilePhotoUrl: string | null = null;
  loading = false;
  pngBusy = false;
  printBusy = false;

  panels: Record<string, boolean> = {
    branding: true,
    details: true,
    religious: true,
    education: true,
    family: true,
    lifestyle: true,
    contact: true,
    content: true,
    fieldChooser: false
  };

  /** Toggles which blocks appear in the live preview. */
  previewBlocks: {
    personal: boolean;
    religious: boolean;
    education: boolean;
    family: boolean;
    lifestyle: boolean;
    contact: boolean;
    about: boolean;
  } = {
    personal: true,
    religious: true,
    education: true,
    family: true,
    lifestyle: true,
    contact: true,
    about: true
  };

  m = {
    brandName: 'Rukmani Matrimony',
    brandTagline: 'Find a match for your perfect life',
    profileId: '',
    fullName: '',
    gender: '',
    dateOfBirth: '',
    age: '',
    height: '',
    weight: '',
    skinTone: '',
    diet: '',
    religion: '',
    caste: '',
    subCaste: '',
    panth: '',
    motherTongue: '',
    maritalStatus: '',
    manglik: '',
    whoUses: '',
    haveChildren: '',
    familyValues: '',
    familyType: '',
    familyIncome: '',
    fatherOccupation: '',
    motherOccupation: '',
    smoke: '',
    drink: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    country: '',
    address: '',
    landmark: '',
    profession: '',
    occupation: '',
    education: '',
    income: '',
    birthPlace: '',
    companyName: '',
    workLocation: '',
    aboutMe: '',
    bio: ''
  };

  private readonly http = inject(HttpClient);

  /** Snapshot while generating PDF/PNG so export matches the Classic Rose mobile layout (screenshot). */
  private previewBlocksSnapshot: {
    personal: boolean;
    religious: boolean;
    education: boolean;
    family: boolean;
    lifestyle: boolean;
    contact: boolean;
    about: boolean;
  } | null = null;
  private selectedTemplateSnapshot: number | null = null;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFromCacheThenApi();
  }

  get templateLabel(): string {
    return this.templates.find(t => t.id === this.selectedTemplate)?.name ?? 'Classic Rose';
  }

  /** Classic Rose (T1) uses the same compact fields as the mobile PDF export. */
  get isClassicCompactPdf(): boolean {
    return this.selectedTemplate === 1;
  }

  /** Footer line shown under preview (matches mobile app export copy). */
  get footerCaption(): string {
    const brand = (this.m.brandName || '').trim() || 'Rukmani Matrimony';
    const tag = (this.m.brandTagline || '').trim();
    return tag ? `${brand} • ${tag}` : brand;
  }

  /** Phone shown in preview/PDF like the app (+91 …). */
  get phoneDisplay(): string {
    const raw = (this.m.phone || '').trim().replace(/\s+/g, '');
    if (!raw) return '';
    if (raw.startsWith('+')) return this.m.phone.trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return this.m.phone.trim();
  }

  goBack(): void {
    this.viewChange.emit(backToDashboardView());
  }

  togglePanel(key: string): void {
    this.panels[key] = !this.panels[key];
  }

  setTemplate(id: number): void {
    this.selectedTemplate = id;
  }

  autofill(): void {
    this.loadFromCacheThenApi(true);
  }

  goUploadPdf(): void {
    this.viewChange.emit('marriage-profile-pdf');
  }

  async exportPng(): Promise<void> {
    if (this.pngBusy) return;
    this.beginExportLayoutSnapshot();
    this.cdr.markForCheck();
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    const el = this.previewRoot?.nativeElement;
    if (!el) {
      this.endExportLayoutSnapshot();
      return;
    }
    this.pngBusy = true;
    try {
      const canvas = await this.capturePreviewCanvas(el);
      const a = document.createElement('a');
      a.download = `${this.exportFileBase()}-biodata.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch {
      window.alert('Could not create image. If a profile photo is used, it may be blocked by the browser for security.');
    } finally {
      this.endExportLayoutSnapshot();
      this.pngBusy = false;
    }
  }

  /** PDF is built from the live preview card only (same region as PNG), not the whole page. */
  async exportPdf(): Promise<void> {
    if (this.printBusy) return;
    this.beginExportLayoutSnapshot();
    this.cdr.markForCheck();
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    const el = this.previewRoot?.nativeElement;
    if (!el) {
      this.endExportLayoutSnapshot();
      return;
    }
    this.printBusy = true;
    try {
      const canvas = await this.capturePreviewCanvas(el);
      await downloadCanvasAsPdf(canvas, `${this.exportFileBase()}-biodata`);
    } catch {
      window.alert('Could not create PDF. If a profile photo is used, it may be blocked by the browser for security.');
    } finally {
      this.endExportLayoutSnapshot();
      this.printBusy = false;
    }
  }

  /**
   * PDF/PNG always match the Classic Rose “compact” screenshot: template T1 + only those sections
   * (no Lifestyle, no extra rows). Restored immediately after capture.
   */
  private beginExportLayoutSnapshot(): void {
    this.previewBlocksSnapshot = { ...this.previewBlocks };
    this.selectedTemplateSnapshot = this.selectedTemplate;
    this.selectedTemplate = 1;
    this.previewBlocks = {
      personal: true,
      religious: true,
      education: true,
      family: true,
      lifestyle: false,
      contact: true,
      about: true
    };
  }

  private endExportLayoutSnapshot(): void {
    if (this.previewBlocksSnapshot) {
      this.previewBlocks = { ...this.previewBlocksSnapshot };
      this.previewBlocksSnapshot = null;
    }
    if (this.selectedTemplateSnapshot !== null) {
      this.selectedTemplate = this.selectedTemplateSnapshot;
      this.selectedTemplateSnapshot = null;
    }
    this.cdr.markForCheck();
  }

  private exportFileBase(): string {
    const raw = (this.m.fullName || '').trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-').slice(0, 48);
    return raw || 'marriage-biodata';
  }

  private async capturePreviewCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
    await this.waitForImages(el);
    const revertImages = await this.swapPreviewImagesToDataUrls(el);
    el.classList.add('preview-card--export-capture');
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    try {
      return await captureElementToCanvas(el, {
        scale: 2.25,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 20000
      });
    } finally {
      el.classList.remove('preview-card--export-capture');
      revertImages();
    }
  }

  /** html2canvas cannot paint cross-origin photos unless pixels are CORS-readable; wait for loads first. */
  private async waitForImages(root: HTMLElement): Promise<void> {
    const imgs = Array.from(root.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalHeight > 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const done = (): void => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      })
    );
  }

  /**
   * Temporarily replace remote img sources with blob: or data: URLs so html2canvas can paint pixels.
   * Restores originals after capture (caller uses finally).
   */
  private async swapPreviewImagesToDataUrls(root: HTMLElement): Promise<() => void> {
    const imgs = Array.from(root.querySelectorAll('img'));
    const restored: { el: HTMLImageElement; src: string; revoke?: () => void }[] = [];
    for (const img of imgs) {
      const src = (img.currentSrc || img.src || '').trim();
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue;

      const blob = await this.fetchImageBlobFromUrl(src);
      const item: { el: HTMLImageElement; src: string; revoke?: () => void } = { el: img, src };
      if (blob) {
        const ou = URL.createObjectURL(blob);
        item.revoke = (): void => URL.revokeObjectURL(ou);
        img.src = ou;
      } else {
        const dataUrl = await this.tryCanvasFromCrossOriginImage(src);
        if (!dataUrl) continue;
        img.src = dataUrl;
      }
      restored.push(item);

      await new Promise<void>((resolve) => {
        if (img.complete && img.naturalHeight > 0) {
          resolve();
          return;
        }
        const done = (): void => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
      try {
        await img.decode();
      } catch {
        /* optional */
      }
    }
    return () => {
      for (const r of restored) {
        r.revoke?.();
        r.el.src = r.src;
      }
    };
  }

  /**
   * Rewrite CDN URLs to same-origin paths so:
   * - Dev: proxy.conf forwards /uploads, /matrimony to vescript (XHR can read the file).
   * - Prod: XHR to https://same-host/uploads/... avoids cross-origin issues when the SPA is on that host.
   */
  private urlForCaptureFetch(url: string): string {
    try {
      const u = new URL(url, window.location.href);
      const imgHost = u.hostname.replace(/^www\./i, '');
      const pageHost = window.location.hostname.replace(/^www\./i, '');
      if (!environment.production && imgHost === 'vescript.vescript.com') {
        return u.pathname + u.search + u.hash;
      }
      if (environment.production && imgHost === pageHost && u.pathname.length > 1) {
        return u.pathname + u.search + u.hash;
      }
    } catch {
      /* ignore */
    }
    return url;
  }

  /** Load raw image bytes (validated). Used for blob: URLs in the preview during capture. */
  private async fetchImageBlobFromUrl(originalUrl: string): Promise<Blob | null> {
    const candidates = [this.urlForCaptureFetch(originalUrl), originalUrl];
    const seen = new Set<string>();
    for (const u of candidates) {
      if (seen.has(u)) continue;
      seen.add(u);
      const blob = await this.tryFetchImageBlobSingleUrl(u);
      if (blob && (await this.blobHasImageSignature(blob))) return blob;
    }
    return null;
  }

  /** API host (production images are often on the same origin as `apiUrl`, with JWT required). */
  private getApiOrigin(): string {
    try {
      return new URL(environment.apiUrl, window.location.href).origin;
    } catch {
      return '';
    }
  }

  private isLikelyImageBlob(blob: Blob): boolean {
    const t = (blob.type || '').toLowerCase();
    return t.startsWith('image/') || t === '' || t === 'application/octet-stream';
  }

  /** Profile files live on the same host as `toAbsoluteUrl` (often equals API origin in production). */
  private isBackendAssetHost(url: string): boolean {
    try {
      const host = new URL(url, window.location.href).hostname.replace(/^www\./i, '');
      const apiHost = new URL(this.getApiOrigin(), window.location.href).hostname.replace(/^www\./i, '');
      return host === apiHost || host === 'vescript.vescript.com';
    } catch {
      return false;
    }
  }

  /** Reject JSON/HTML error bodies masquerading as blobs. */
  private async blobHasImageSignature(blob: Blob): Promise<boolean> {
    if (blob.size < 12) return false;
    if ((blob.type || '').toLowerCase().startsWith('image/')) return true;
    const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    if (head[0] === 0x3c) return false;
    if (head[0] === 0xff && head[1] === 0xd8) return true;
    if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return true;
    if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) return true;
    if (head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46) return true;
    if (head[0] === 0x42 && head[1] === 0x4d) return true;
    return false;
  }

  private async tryFetchImageBlobSingleUrl(url: string): Promise<Blob | null> {
    const imgOrigin = new URL(url, window.location.href).origin;
    const apiOrigin = this.getApiOrigin();
    const spaOrigin = window.location.origin;

    const okBlob = (blob: Blob | null): Blob | null => {
      if (!blob || !this.isLikelyImageBlob(blob) || blob.size === 0) return null;
      return blob;
    };

    if (imgOrigin === spaOrigin) {
      try {
        const blob = okBlob(await firstValueFrom(this.http.get(url, { responseType: 'blob' })));
        if (blob) return blob;
      } catch {
        /* fall through */
      }
      try {
        const res = await fetch(url, { credentials: 'include', cache: 'force-cache' });
        if (res.ok) {
          const blob = okBlob(await res.blob());
          if (blob) return blob;
        }
      } catch {
        /* fall through */
      }
    }

    if (apiOrigin && imgOrigin === apiOrigin) {
      try {
        const blob = okBlob(await firstValueFrom(this.http.get(url, { responseType: 'blob' })));
        if (blob) return blob;
      } catch {
        /* fall through */
      }
    }

    if (this.isBackendAssetHost(url)) {
      try {
        const blob = okBlob(await firstValueFrom(this.http.get(url, { responseType: 'blob' })));
        if (blob) return blob;
      } catch {
        /* fall through */
      }
    }

    try {
      const res = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache',
        referrerPolicy: 'no-referrer'
      });
      if (!res.ok) return null;
      return okBlob(await res.blob());
    } catch {
      /* ignore */
    }
    return null;
  }

  /** Reload with crossOrigin so drawImage + toDataURL works when CDN sends CORS headers. */
  private tryCanvasFromCrossOriginImage(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = (): void => {
        try {
          const w = img.naturalWidth || 1;
          const h = img.naturalHeight || 1;
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = (): void => resolve(null);
      img.src = url;
    });
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = (): void => resolve(fr.result as string);
      fr.onerror = (): void => reject(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  private loadFromCacheThenApi(forceRemote = false): void {
    const userId = this.resolveUserId();
    if (!forceRemote) {
      try {
        const cached = localStorage.getItem('my_profile_data');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            this.applyProfileObject(parsed);
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (!userId) return;
    this.loading = true;
    this.api.getMyProfileDetails(userId).subscribe({
      next: (res: any) => {
        const data =
          res?.data?.profile ||
          res?.data?.user ||
          res?.profile ||
          res?.user ||
          res?.data ||
          null;
        if (data && typeof data === 'object') {
          this.applyProfileObject(data);
          this.mergeProfileFromLocalStorage();
          try {
            localStorage.setItem('my_profile_data', JSON.stringify(data));
          } catch {
            /* ignore */
          }
        }
        this.loadPhoto(userId);
        this.loading = false;
      },
      error: () => {
        this.loadPhoto(userId);
        this.loading = false;
      }
    });
  }

  private loadPhoto(userId: string): void {
    this.api.listMyPhotos(userId).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.photos) && res.photos.length > 0) {
          const sorted = [...res.photos].sort(
            (a, b) => ((a as any)?.sortOrder ?? 0) - ((b as any)?.sortOrder ?? 0)
          );
          const first = sorted[0];
          const raw = typeof first === 'string' ? first : (first as any)?.url;
          if (raw && typeof raw === 'string') {
            this.profilePhotoUrl = normalizeProfileImageUrl(this.toAbsoluteUrl(raw.trim()));
          }
        }
      },
      error: () => {}
    });
  }

  /** After API merge, fill gaps from cached profile (API payloads are often partial). */
  private mergeProfileFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem('my_profile_data');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        this.applyProfileObject(parsed, true);
      }
    } catch {
      /* ignore */
    }
  }

  /**
   * Reads nested profile/user/data trees like the mobile app (user.profile.*, etc.).
   * Never overwrites existing non-empty values when `mergeOnly` is true.
   */
  private deepGet(src: any, ...keys: string[]): any {
    if (!src || typeof src !== 'object') return undefined;
    const tryObj = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return undefined;
      for (const k of keys) {
        const v = obj[k];
        if (v != null && v !== '') return v;
      }
      return undefined;
    };

    let v = tryObj(src);
    if (v !== undefined) return v;

    const L1 = ['profile', 'user', 'data'];
    for (const a of L1) {
      const o = src[a];
      if (!o || typeof o !== 'object') continue;
      v = tryObj(o);
      if (v !== undefined) return v;
      for (const b of L1) {
        const inner = o[b];
        if (!inner || typeof inner !== 'object') continue;
        v = tryObj(inner);
        if (v !== undefined) return v;
      }
    }
    return undefined;
  }

  private strVal(v: any): string {
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.map(x => String(x)).join(', ');
    return String(v).trim();
  }

  /** Assign only if incoming has content, or replace when mergeOnly is false. */
  private setStr(field: string, incoming: string, mergeOnly: boolean): void {
    const cur = String((this.m as Record<string, string>)[field] ?? '').trim();
    const next = incoming.trim();
    if (mergeOnly) {
      if (!cur && next) (this.m as Record<string, string>)[field] = next;
    } else {
      (this.m as Record<string, string>)[field] = next || cur;
    }
  }

  private applyProfileObject(src: any, mergeOnly = false): void {
    const g = (...keys: string[]) => this.deepGet(src, ...keys);
    const str = (v: any) => this.strVal(v);

    const nameFromParts =
      str(g('fullName', 'full_name', 'name')) ||
      `${str(g('firstName', 'first_name'))} ${str(g('lastName', 'last_name'))}`.trim();

    this.setStr('profileId', str(g('id', 'profileId', 'profile_id', 'userId', 'user_id')), mergeOnly);
    this.setStr('fullName', nameFromParts, mergeOnly);
    this.setStr('gender', str(g('gender')), mergeOnly);
    const dobRaw = g('dateOfBirth', 'date_of_birth', 'dob', 'birthDate');
    const dobNorm = this.normalizeDateInput(typeof dobRaw === 'string' ? dobRaw : str(dobRaw));
    if (dobNorm) {
      if (mergeOnly && !this.m.dateOfBirth.trim()) this.m.dateOfBirth = dobNorm;
      else if (!mergeOnly) this.m.dateOfBirth = dobNorm || this.m.dateOfBirth;
    }
    this.setStr('age', str(g('age')) || this.computeAgeFromDob(this.m.dateOfBirth), mergeOnly);
    this.setStr('height', str(g('height')), mergeOnly);
    this.setStr('weight', str(g('weight')), mergeOnly);
    this.setStr('skinTone', str(g('skinTone', 'skin_tone', 'complexion')), mergeOnly);
    this.setStr('diet', str(g('diet')), mergeOnly);
    this.setStr('birthPlace', str(g('birthPlace', 'birth_place', 'placeOfBirth')), mergeOnly);

    this.setStr('religion', str(g('religion')), mergeOnly);
    this.setStr('caste', str(g('caste')), mergeOnly);
    this.setStr('subCaste', str(g('subCaste', 'sub_caste')), mergeOnly);
    this.setStr('panth', str(g('panth', 'gotra', 'Gotra')), mergeOnly);
    this.setStr('motherTongue', str(g('motherTongue', 'mother_tongue')), mergeOnly);
    const rawMarital = g('maritalStatus', 'marital_status');
    const maritalStr =
      typeof rawMarital === 'string' && rawMarital.toLowerCase() === 'single'
        ? 'Single'
        : str(rawMarital);
    this.setStr('maritalStatus', maritalStr, mergeOnly);
    this.setStr('manglik', str(g('manglikStatus', 'manglik_status', 'manglik')), mergeOnly);
    this.setStr('whoUses', str(g('whoUses', 'who_uses', 'profileFor', 'profile_for')), mergeOnly);
    this.setStr('haveChildren', str(g('haveChildren', 'have_children')), mergeOnly);

    const fv = g('familyValues', 'family_values');
    const fvStr = Array.isArray(fv) ? fv.map(String).join(', ') : str(fv);
    this.setStr('familyValues', fvStr, mergeOnly);
    this.setStr('familyType', str(g('familyType', 'family_type', 'familyStatus', 'family_status')), mergeOnly);
    this.setStr('familyIncome', str(g('familyIncome', 'family_income')), mergeOnly);
    this.setStr('fatherOccupation', str(g('fatherOccupation', 'father_occupation')), mergeOnly);
    this.setStr('motherOccupation', str(g('motherOccupation', 'mother_occupation')), mergeOnly);

    const sm = g('doSmoke', 'smoke');
    const smokeStr = typeof sm === 'boolean' ? (sm ? 'Yes' : 'No') : str(sm);
    this.setStr('smoke', smokeStr, mergeOnly);
    const dr = g('doDrink', 'drink');
    const drinkStr = typeof dr === 'boolean' ? (dr ? 'Yes' : 'No') : str(dr);
    this.setStr('drink', drinkStr, mergeOnly);

    const rawPhone =
      g('phone', 'mobile', 'whatsapp', 'contactNumber', 'contact_number', 'phoneNumber', 'phone_number', 'mobileNumber', 'mobile_number') ??
      g('contact');
    if (rawPhone != null && String(rawPhone).trim()) {
      const cleaned = String(rawPhone).replace(/^\+\d{1,3}\s*/, '').trim();
      this.setStr('phone', cleaned, mergeOnly);
    }

    this.setStr('email', str(g('email')), mergeOnly);
    this.setStr('city', str(g('city')), mergeOnly);
    this.setStr('state', str(g('state')), mergeOnly);
    this.setStr('country', str(g('country')), mergeOnly);
    const addr = g('address', 'permanentAddress', 'currentAddress', 'residentialAddress');
    this.setStr('address', str(addr), mergeOnly);
    this.setStr('landmark', str(g('landmark')), mergeOnly);

    this.setStr('profession', str(g('profession')), mergeOnly);
    const occ =
      str(g('employeeIn', 'employee_in', 'employmentType')) ||
      str(g('occupation')) ||
      str(g('profession'));
    this.setStr('occupation', occ, mergeOnly);
    this.setStr('education', str(g('education')), mergeOnly);
    this.setStr('income', str(g('income', 'annualIncome', 'annual_income', 'salary')), mergeOnly);
    this.setStr('companyName', str(g('companyName', 'company_name')), mergeOnly);
    this.setStr('workLocation', str(g('workLocation', 'work_location', 'jobLocation', 'job_location')), mergeOnly);

    const about = g('aboutMe', 'about_me', 'aboutYourself', 'about_yourself', 'bio', 'description');
    this.setStr('aboutMe', str(about), mergeOnly);
    const bioOnly = str(g('bio'));
    if (bioOnly) this.setStr('bio', bioOnly, mergeOnly);
    else if (!mergeOnly && str(about)) this.m.bio = str(about);

    const pickG = (...keys: string[]) => this.deepGet(src, ...keys);
    const photoUrl = this.pickPhotoUrl(src, pickG);
    if (photoUrl) this.profilePhotoUrl = normalizeProfileImageUrl(photoUrl);
  }

  private pickPhotoUrl(src: any, g: (...keys: string[]) => any): string | null {
    const direct = g('firstPhotoUrl', 'first_photo_url', 'avatar', 'profilePicture', 'profilePhoto', 'photo', 'image');
    if (typeof direct === 'string' && direct.trim()) {
      return this.toAbsoluteUrl(direct.split(',')[0].trim());
    }
    if (direct && typeof direct === 'object') {
      const u = direct.url || direct.path || direct.src;
      if (typeof u === 'string' && u.trim()) return this.toAbsoluteUrl(u.trim());
    }
    const arr = g('profilePhotos', 'profile_photos', 'photos', 'images', 'gallery');
    if (Array.isArray(arr) && arr.length > 0) {
      const p = arr[0];
      const u = typeof p === 'string' ? p : p?.url || p?.path;
      if (typeof u === 'string' && u.trim()) return this.toAbsoluteUrl(u.trim());
    }
    return null;
  }

  private toAbsoluteUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('//')) return url;
    return 'https://vescript.vescript.com' + (url.startsWith('/') ? '' : '/') + url;
  }

  private normalizeDateInput(raw: any): string {
    if (raw == null) return '';
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      return raw.toISOString().slice(0, 10);
    }
    const s = String(raw).trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  }

  private computeAgeFromDob(iso: string): string {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return '';
    const d = new Date(iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return '';
    let age = new Date().getFullYear() - d.getFullYear();
    const m = new Date().getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) age--;
    return age > 0 ? String(age) : '';
  }

  private resolveUserId(): string | null {
    const profileUserId = localStorage.getItem('profile_user_id');
    if (profileUserId) return profileUserId;
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;
    try {
      const user = JSON.parse(storedUser) as { id?: string | number; userId?: string | number; _id?: string | number };
      const userId = user.id || user.userId || user._id;
      return userId ? String(userId) : null;
    } catch {
      return null;
    }
  }
}
