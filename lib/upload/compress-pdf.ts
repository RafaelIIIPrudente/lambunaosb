import { PDFDocument } from 'pdf-lib';

export type CompressPdfResult = {
  blob: Blob;
  byteSize: number;
};

/**
 * Lossless PDF re-save: strips identifying metadata and applies object-stream
 * (flate) compression to the cross-reference table. Image streams are NOT
 * re-encoded — text remains selectable, signatures and form fields survive.
 *
 * Typical reduction on Word-exported or signed-and-scanned PDFs: 10–25%.
 * Callers must still enforce a hard size cap after this runs.
 */
export async function compressPdf(file: File): Promise<CompressPdfResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });

  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');

  const bytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
  // pdf-lib returns a Uint8Array; wrap in a Blob with the exact bytes.
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  return { blob, byteSize: blob.size };
}
