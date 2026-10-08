/**
 * Rasterises a rendered invoice into a multi-page A4 PDF.
 *
 * WHY THIS EXISTS AT ALL: Bengali needs complex text shaping (conjuncts, reph,
 * pre-base vowel reordering). jsPDF/pdf-lib/pdfmake embed a font but have no
 * shaping engine, so Bengali drawn with their text APIs comes out broken. The
 * browser *does* shape it — so we let the browser draw the invoice (see
 * InvoiceDocument), snapshot that DOM to a canvas, and wrap the pixels in a
 * PDF container.
 *
 * The trade-off, stated plainly: the result is an image. Text is not selectable
 * or searchable, quality is ~150 DPI at scale 2, and files run a few hundred KB.
 * `window.print()` on the same page stays the high-fidelity route — vector text,
 * real glyphs, tiny files. Use this when a direct download matters more than
 * text fidelity.
 *
 * Both packages are imported dynamically so they never enter the shared bundle.
 */

/**
 * @param {HTMLElement} node       element to capture (the .invoice-sheet)
 * @param {object}      [options]
 * @param {number}      [options.scale=2]  capture scale; 2 ≈ 150 DPI on A4
 * @returns {Promise<Blob>}  PDF blob
 */
export async function buildInvoicePdf(node, { scale = 2 } = {}) {
  if (!node) throw new Error('Nothing to export');

  // Without this the canvas can be captured before the Bengali webfont has
  // loaded, producing fallback glyphs or blank boxes.
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(node, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    // The sheet is a fixed-width block; capturing at its own width avoids the
    // scaled-down rendering html2canvas applies to wide elements.
    windowWidth: node.scrollWidth,
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();   // 210
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297

  // Slice the tall canvas across as many pages as it needs.
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  let rendered = 0;

  while (rendered < imgHeight) {
    const sliceHeight = Math.min(pageHeight, imgHeight - rendered);
    // addImage takes the whole canvas plus a source rectangle, so each page
    // draws only its own band.
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.round((sliceHeight / imgHeight) * canvas.height);
    slice.getContext('2d').drawImage(
      canvas,
      0,
      Math.round((rendered / imgHeight) * canvas.height),
      canvas.width,
      slice.height,
      0,
      0,
      canvas.width,
      slice.height
    );

    if (rendered > 0) pdf.addPage();
    pdf.addImage(
      slice.toDataURL('image/jpeg', 0.92),
      'JPEG',
      0,
      0,
      pageWidth,
      sliceHeight
    );
    rendered += sliceHeight;
  }

  return pdf.output('blob');
}

/** Triggers a browser download for a blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
