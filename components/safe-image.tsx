"use client";

import Image, { type ImageProps } from "next/image";
import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";

export function SafeImage(props: ImageProps) {
  const { alt, className, fill, height, onError, src, style, width, ...imageProps } = props;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  function handleError(event: React.SyntheticEvent<HTMLImageElement, Event>) {
    onError?.(event);
    if (typeof src === "string") {
      try {
        const url = new URL(src, window.location.origin);
        console.warn("[Image] Image failed to load.", {
          host: url.host,
          path: url.pathname,
        });
      } catch {
        console.warn("[Image] Image failed to load.", { source: "invalid URL" });
      }
    }
    setFailed(true);
  }

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`${alt || "Product image"} (image unavailable)`}
        className={`grid place-items-center bg-[#eadfce] text-[#b48d55] ${fill ? "absolute inset-0" : ""} ${className || ""}`}
        style={{
          ...style,
          ...(fill ? { position: "absolute", inset: 0 } : {}),
          ...(typeof width === "number" ? { width } : {}),
          ...(typeof height === "number" ? { height } : {}),
        }}
      >
        <ImagePlus size={24} aria-hidden="true" />
        <span className="sr-only">Image unavailable</span>
      </div>
    );
  }

  return <Image {...imageProps} alt={alt} className={className} fill={fill} height={height} onError={handleError} src={src} style={style} width={width} />;
}
