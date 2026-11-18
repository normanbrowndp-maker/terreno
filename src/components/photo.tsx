"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Photo } from "@/modules/catalog";

export function EditorialPhoto({
  photo,
  name,
  priority = false,
  className = "",
  variant = "editorial",
}: {
  photo: Photo | null;
  name: string;
  priority?: boolean;
  className?: string;
  variant?: "editorial" | "thumbnail";
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className={`editorial-photo ${className}`}>
      {photo && !failed ? (
        <>
          <Image
            data-photo
            src={photo.src}
            alt={photo.alt}
            fill
            sizes="(max-width:767px) 90vw, 380px"
            priority={priority}
            onError={() => setFailed(true)}
          />
          {variant === "editorial" ? (
            <Link
              className="photo-credit-link"
              href={`/sources#${photo.src.split("/").pop()?.replace(".jpg", "")}`}
              aria-label={`Photo credits for ${name}`}
            >
              ©
            </Link>
          ) : null}
        </>
      ) : (
        <div
          className="photo-placeholder"
          role="img"
          aria-label={`${name}: photograph unavailable`}
        >
          <span>{name}</span>
          <small>Photograph coming soon</small>
        </div>
      )}
    </figure>
  );
}
