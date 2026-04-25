"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import WidgetShell from "./WidgetShell";
import { getRecentJobImages } from "@/lib/frappe";

interface JobImage {
  url: string;
  job_name: string;
  job_id: string;
  uploaded_at: string;
}

const SITE = process.env.NEXT_PUBLIC_FRAPPE_SITE || "https://manytalentsmore.v.frappe.cloud";
const MAX_IMAGES = 12;

export default function JobsImagesWidget() {
  const router = useRouter();
  const [images, setImages] = useState<JobImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecentJobImages(MAX_IMAGES)
      .then((data) => setImages(data.images ?? []))
      .catch((err) => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title="Recent Photos" loading={loading}>
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : images.length === 0 ? (
        <p className="text-cream/40 text-sm italic">No recent photos.</p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {images.map((img, i) => {
            const src = img.url.startsWith("http") ? img.url : `${SITE}${img.url}`;
            return (
              <button
                key={`${img.job_name}-${i}`}
                onClick={() => router.push(`/manager/jobs/${img.job_name}`)}
                className="relative aspect-square overflow-hidden rounded-md bg-navy-border hover:ring-2 hover:ring-gold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                aria-label={`Photo for job ${img.job_id}`}
                title={`Job ${img.job_id}`}
              >
                <Image
                  src={src}
                  alt={`Job ${img.job_id} photo`}
                  fill
                  sizes="(max-width: 768px) 25vw, 10vw"
                  className="object-cover"
                  unoptimized
                />
              </button>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
}
