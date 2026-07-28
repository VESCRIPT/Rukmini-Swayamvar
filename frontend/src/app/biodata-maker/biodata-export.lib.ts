/**
 * Lazy-loaded PDF/PNG export helpers (html2canvas + jspdf are CommonJS).
 * Kept in a separate module so the main biodata bundle can split them into async chunks.
 */

export type Html2CanvasOptions = Parameters<
  Awaited<ReturnType<typeof loadHtml2Canvas>>
>[1];

let html2CanvasLoader: Promise<typeof import('html2canvas').default> | null = null;
let jsPdfLoader: Promise<typeof import('jspdf').jsPDF> | null = null;

function loadHtml2Canvas(): Promise<typeof import('html2canvas').default> {
  if (!html2CanvasLoader) {
    html2CanvasLoader = import('html2canvas').then((m) => m.default);
  }
  return html2CanvasLoader;
}

function loadJsPDF(): Promise<typeof import('jspdf').jsPDF> {
  if (!jsPdfLoader) {
    jsPdfLoader = import('jspdf').then((m) => m.jsPDF);
  }
  return jsPdfLoader;
}

export async function captureElementToCanvas(
  el: HTMLElement,
  options: Html2CanvasOptions
): Promise<HTMLCanvasElement> {
  const html2canvas = await loadHtml2Canvas();
  return html2canvas(el, options);
}

/** Single A4 page: scale biodata image to fit with margins. */
export async function downloadCanvasAsPdf(
  canvas: HTMLCanvasElement,
  filenameWithoutExt: string
): Promise<void> {
  const W = canvas.width;
  const H = canvas.height;
  if (W <= 0 || H <= 0) return;

  const JsPDF = await loadJsPDF();
  const pdf = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const marginMm = 8;
  const maxW = pageW - marginMm * 2;
  const maxH = pageH - marginMm * 2;

  const imgData = canvas.toDataURL('image/png');
  const aspect = H / W;
  let drawW = maxW;
  let drawH = drawW * aspect;
  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH / aspect;
  }
  const x = marginMm + (maxW - drawW) / 2;
  const y = marginMm + (maxH - drawH) / 2;

  pdf.addImage(imgData, 'PNG', x, y, drawW, drawH);
  pdf.save(`${filenameWithoutExt}.pdf`);
}
