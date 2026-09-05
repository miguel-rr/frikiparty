/**
 * Pictures from the wiki bucket (r2.dev). Plain `img`: the host is not
 * allow-listed for next/image and the files are already sized (≤ 800 px
 * WebP) by the image pipeline.
 */
const WikiImage = ({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) => (
  // biome-ignore lint/performance/noImgElement: remote host not allow-listed in next.config for next/image
  <img alt={alt} className={className} loading="lazy" src={src} />
);

export { WikiImage };
