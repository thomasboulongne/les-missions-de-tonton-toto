import { getOptimizedImageUrl } from '../../lib/api';

// Default breakpoints for srcset generation
const DEFAULT_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920];

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** The source URL of the image */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /**
   * Widths to generate for srcset.
   * Defaults to [320, 640, 768, 1024, 1280, 1536, 1920]
   */
  widths?: number[];
  /**
   * The sizes attribute for responsive images.
   * @example "100vw" - full viewport width
   * @example "(max-width: 768px) 100vw, 800px" - full width on mobile, 800px on desktop
   */
  sizes?: string;
  /**
   * Image quality (1-100). Defaults to 80.
   */
  quality?: number;
  /**
   * Output format. If not specified, auto-detects WebP/AVIF support.
   */
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  /**
   * How the image should fit within its container when resized.
   */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Generates a srcset string for responsive images using the optimization API.
 */
function generateSrcSet(
  src: string,
  widths: number[],
  quality: number,
  format?: 'webp' | 'avif' | 'jpeg' | 'png',
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
): string {
  // Only generate srcset for optimizable images (those served from /images/)
  if (!src.startsWith('/images/')) {
    return '';
  }

  return widths
    .map((width) => {
      const url = getOptimizedImageUrl(src, { width, quality, format, fit });
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * OptimizedImage component that automatically generates srcset for responsive images.
 *
 * Uses the on-demand image optimization API to serve appropriately sized images
 * based on the device's viewport and pixel density.
 *
 * @example
 * // Basic usage - full width hero image
 * <OptimizedImage
 *   src="/images/uploads/hero.jpg"
 *   alt="Hero"
 *   sizes="100vw"
 * />
 *
 * @example
 * // Constrained width with custom breakpoints
 * <OptimizedImage
 *   src="/images/uploads/thumbnail.jpg"
 *   alt="Thumbnail"
 *   widths={[200, 400, 600]}
 *   sizes="(max-width: 600px) 100vw, 300px"
 *   quality={70}
 * />
 */
export function OptimizedImage({
  src,
  alt,
  widths = DEFAULT_WIDTHS,
  sizes,
  quality = 80,
  format,
  fit,
  loading = 'lazy',
  decoding = 'async',
  ...props
}: OptimizedImageProps) {
  // Generate srcset for responsive images
  const srcSet = generateSrcSet(src, widths, quality, format, fit);

  // Use optimized src as fallback (medium size)
  const fallbackSrc = src.startsWith('/images/')
    ? getOptimizedImageUrl(src, { width: 1024, quality, format, fit })
    : src;

  return (
    <img
      src={fallbackSrc}
      srcSet={srcSet || undefined}
      sizes={sizes}
      alt={alt}
      loading={loading}
      decoding={decoding}
      {...props}
    />
  );
}

