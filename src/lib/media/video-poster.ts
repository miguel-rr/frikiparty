/**
 * Browser-side video probing: dimensions, duration and a poster frame,
 * since the server has no ffmpeg. Resolves null when the browser can't
 * decode the file (the upload still proceeds, just without a thumbnail).
 */

type VideoProbe = {
  width: number;
  height: number;
  durationSeconds: number;
  poster: Blob | null;
};

const POSTER_MAX_SIDE = 1600;
const PROBE_TIMEOUT_MS = 10000;
const SEEK_TIMEOUT_MS = 3000;
const HAVE_CURRENT_DATA = 2;

const probeVideo = (file: File): Promise<VideoProbe | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    // Off-screen but in the document: some browsers won't decode a
    // detached element.
    video.style.cssText =
      'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(video);

    let settled = false;
    let seekTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = (result: VideoProbe | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (seekTimer) {
        clearTimeout(seekTimer);
      }
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
      video.remove();
      resolve(result);
    };
    const timer = setTimeout(() => {
      // Metadata arrived but no drawable frame in time: keep what we know.
      if (video.videoWidth && video.videoHeight) {
        capture();
      } else {
        finish(null);
      }
    }, PROBE_TIMEOUT_MS);

    const capture = () => {
      const { videoWidth: width, videoHeight: height } = video;
      const durationSeconds = Number.isFinite(video.duration)
        ? Math.round(video.duration)
        : 0;
      if (!width || !height) {
        finish(null);
        return;
      }
      if (video.readyState < HAVE_CURRENT_DATA) {
        finish({ width, height, durationSeconds, poster: null });
        return;
      }
      const scale = Math.min(1, POSTER_MAX_SIDE / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        finish({ width, height, durationSeconds, poster: null });
        return;
      }
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => finish({ width, height, durationSeconds, poster: blob }),
          'image/jpeg',
          0.85,
        );
      } catch {
        finish({ width, height, durationSeconds, poster: null });
      }
    };

    video.addEventListener('error', () => finish(null), { once: true });
    video.addEventListener(
      'loadedmetadata',
      () => {
        // A frame from a little way in reads better than the black first
        // frame. Recorded clips without a known duration can't seek, so
        // they use whatever frame decodes first.
        const seekable =
          Number.isFinite(video.duration) && video.duration > 0.5;
        if (!seekable) {
          video.addEventListener('loadeddata', capture, { once: true });
          return;
        }
        video.addEventListener('seeked', capture, { once: true });
        seekTimer = setTimeout(capture, SEEK_TIMEOUT_MS);
        video.currentTime = Math.min(1, video.duration / 10);
      },
      { once: true },
    );
    video.src = url;
  });

export { probeVideo, type VideoProbe };
