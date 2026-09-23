import React, { useCallback, useState } from 'react';
import { DEFAULT_COVER } from '../utils/imageUtils';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

const ImageWithFallbackInner: React.FC<ImageWithFallbackProps> = ({
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

  React.useEffect(() => {
    if (src) {
      setImgSrc(src);
      setHasError(false);
    } else {
      setImgSrc(fallbackSrc);
    }
  }, [src, fallbackSrc]);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (!hasError) {
        setHasError(true);
        setImgSrc(fallbackSrc);
      }
      if (onError) {
        onError(e);
      }
    },
    [hasError, fallbackSrc, onError]
  );

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

export const ImageWithFallback = React.memo(ImageWithFallbackInner);
