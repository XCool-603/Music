import React, { useState } from 'react';
import { DEFAULT_COVER } from '../utils/imageUtils';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = '',
  className = '',
  fallbackSrc = DEFAULT_COVER,
  onError,
  loading = 'lazy',
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  // Sync if src changes
  React.useEffect(() => {
    if (src) {
      setImgSrc(src);
      setHasError(false);
    } else {
      setImgSrc(fallbackSrc);
    }
  }, [src, fallbackSrc]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
    if (onError) {
      onError(e);
    }
  };

  return (
    <img
      src={imgSrc || fallbackSrc}
      alt={alt}
      className={className}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={handleError}
      {...props}
    />
  );
};
