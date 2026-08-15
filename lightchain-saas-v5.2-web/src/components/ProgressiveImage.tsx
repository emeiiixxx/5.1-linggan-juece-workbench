import { useEffect, useRef, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";

type ProgressiveImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
};

export function ProgressiveImage({
  className = "",
  loading,
  decoding = "async",
  priority = false,
  onLoad,
  onError,
  src,
  ...props
}: ProgressiveImageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    setStatus("loading");
    if (imageRef.current?.complete && imageRef.current.naturalWidth > 0) setStatus("loaded");
  }, [src]);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    setStatus("loaded");
    onLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    setStatus("error");
    onError?.(event);
  };

  return (
    <img
      {...props}
      ref={imageRef}
      src={src}
      className={`progressive-image progressive-image--${status}${className ? ` ${className}` : ""}`}
      loading={loading ?? (priority ? "eager" : "lazy")}
      decoding={decoding}
      fetchPriority={priority ? "high" : "auto"}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
