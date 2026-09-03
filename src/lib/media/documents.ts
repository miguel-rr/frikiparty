/**
 * Documents in Los Archivos (.pptx, .pdf): how they're labelled and
 * previewed. Shared by the upload sheet, the tiles, the table and the
 * figure; the server side only needs the mime types.
 */

const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const PDF_MIME = 'application/pdf';

const DOCUMENT_LABELS: Record<string, string> = {
  [PDF_MIME]: 'PDF',
  [PPTX_MIME]: 'PPTX',
};

/** "PDF" / "PPTX" — the badge a document wears everywhere. */
const documentLabel = (mimeType: string) => DOCUMENT_LABELS[mimeType] ?? 'DOC';

const isPdf = (mimeType: string) => mimeType === PDF_MIME;

/**
 * Microsoft's Office web viewer, fed the public URL of the file. No
 * conversion on our side; if the service is down, the download remains.
 */
const officeViewerUrl = (fileUrl: string) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

/** "1.4 MB" / "640 KB". */
const formatFileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export {
  documentLabel,
  formatFileSize,
  isPdf,
  officeViewerUrl,
  PDF_MIME,
  PPTX_MIME,
};
