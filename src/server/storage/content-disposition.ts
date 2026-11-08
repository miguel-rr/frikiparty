/**
 * A Content-Disposition carrying the original file name in both
 * spellings: a plain ASCII one and the RFC 5987 UTF-8 one for accents.
 */
const contentDisposition = (
  kind: 'inline' | 'attachment',
  fileName: string,
) => {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

export { contentDisposition };
