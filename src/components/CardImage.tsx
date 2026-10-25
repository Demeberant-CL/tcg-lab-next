import React, { memo, useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { CardImages } from '../data/cardImages';

interface CardImageProps {
  set: string;
  number: number | string;
  alt: string;
  className?: string;
  eager?: boolean;
}

/**
 * Imagen de carta con cadena de respaldo: si una URL falla prueba la siguiente
 * y, si todas fallan, muestra un marcador en vez de una imagen rota.
 */
export const CardImage: React.FC<CardImageProps> = memo(
  ({ set, number, alt, className = '', eager = false }) => {
    const [attempt, setAttempt] = useState(0);
    const urls = CardImages.fallbackUrls(set, number);

    useEffect(() => {
      setAttempt(0);
    }, [set, number]);

    if (attempt >= urls.length) {
      return (
        <div
          role="img"
          aria-label={alt}
          className={`flex items-center justify-center text-[color:var(--muted-color)] ${className}`}
        >
          <ImageOff className="w-6 h-6 opacity-60" />
        </div>
      );
    }

    return (
      <img
        src={urls[attempt]}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setAttempt((n) => n + 1)}
        className={className}
      />
    );
  }
);

CardImage.displayName = 'CardImage';
