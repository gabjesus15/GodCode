"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
import { isCloudinaryImageUrl } from "@/lib/tenant/images/is-cloudinary-image-url";

export function CartEnhanceCatalogGlyph({
  imageUrl,
  fallbackSrc,
}: {
  imageUrl: string | null | undefined;
  fallbackSrc: string;
}) {
  const resolved = useMemo(() => {
    const raw = typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;
    if (!raw || isCloudinaryImageUrl(raw)) return null;
    return raw;
  }, [imageUrl]);

  const primary = resolved ?? fallbackSrc;
  const [failed, setFailed] = useState(false);
  const src = failed ? fallbackSrc : primary;

  return (
    <span className="cart-enhance-tile-glyph cart-enhance-tile-glyph--media" aria-hidden>
      <Image
        key={primary}
        src={src}
        alt=""
        width={44}
        height={44}
        quality={70}
        unoptimized={shouldUnoptimizeImageSrc(src)}
        className="cart-enhance-tile-img"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
