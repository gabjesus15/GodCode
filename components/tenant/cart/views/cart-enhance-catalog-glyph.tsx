"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

export function CartEnhanceCatalogGlyph({
  imageUrl,
  fallbackSrc,
}: {
  imageUrl: string | null | undefined;
  fallbackSrc: string;
}) {
  const resolved = useMemo(() => {
    const raw = typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;
    if (!raw) return null;
    return raw;
  }, [imageUrl]);

  const primary = resolved ?? fallbackSrc;
  const [src, setSrc] = useState(primary);

  return (
    <span className="cart-enhance-tile-glyph cart-enhance-tile-glyph--media" aria-hidden>
      <Image
        src={src}
        alt=""
        width={44}
        height={44}
        unoptimized
        className="cart-enhance-tile-img"
        onError={() => setSrc(fallbackSrc)}
      />
    </span>
  );
}
