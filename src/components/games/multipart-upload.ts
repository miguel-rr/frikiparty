/**
 * Sends a file to R2 in parts, from presigned part URLs: a few parts at
 * a time, each one retried on its own when the connection drops, with
 * one overall progress figure. The caller closes (or aborts) the upload.
 */

const CONCURRENCY = 3;
const ATTEMPTS = 4;

type Progress = { loaded: number; total: number };

class UploadCancelled extends Error {
  constructor() {
    super('Subida cancelada.');
  }
}

const putPart = (
  url: string,
  body: Blob,
  signal: AbortSignal,
  onLoaded: (bytes: number) => void,
) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new UploadCancelled());
      return;
    }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener('abort', abort, { once: true });
    xhr.open('PUT', url);
    xhr.upload.onprogress = (event) => onLoaded(event.loaded);
    xhr.onload = () => {
      signal.removeEventListener('abort', abort);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`El almacén respondió ${xhr.status}.`));
      }
    };
    xhr.onerror = () => {
      signal.removeEventListener('abort', abort);
      reject(new Error('Se perdió la conexión al subir.'));
    };
    xhr.onabort = () => reject(new UploadCancelled());
    xhr.send(body);
  });

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const uploadParts = async ({
  file,
  partSize,
  partUrls,
  signal,
  onProgress,
}: {
  file: File;
  partSize: number;
  partUrls: string[];
  signal: AbortSignal;
  onProgress: (progress: Progress) => void;
}) => {
  // One failed part stops the others: the whole upload is retried or dropped.
  const inner = new AbortController();
  signal.addEventListener('abort', () => inner.abort(), { once: true });
  const loadedByPart = new Array<number>(partUrls.length).fill(0);
  const report = () =>
    onProgress({
      loaded: loadedByPart.reduce((sum, bytes) => sum + bytes, 0),
      total: file.size,
    });

  const sendPart = async (index: number) => {
    const body = file.slice(index * partSize, (index + 1) * partSize);
    for (let attempt = 1; ; attempt++) {
      try {
        await putPart(
          partUrls[index] as string,
          body,
          inner.signal,
          (bytes) => {
            loadedByPart[index] = bytes;
            report();
          },
        );
        loadedByPart[index] = body.size;
        report();
        return;
      } catch (error) {
        loadedByPart[index] = 0;
        report();
        if (error instanceof UploadCancelled || attempt >= ATTEMPTS) {
          throw error;
        }
        await wait(1000 * 2 ** attempt);
      }
    }
  };

  let next = 0;
  const worker = async () => {
    try {
      while (next < partUrls.length) {
        const index = next++;
        await sendPart(index);
      }
    } catch (error) {
      inner.abort();
      throw error;
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, partUrls.length) }, worker),
  );
};

export { type Progress, UploadCancelled, uploadParts };
