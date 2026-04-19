import { useState } from 'react';

interface ImageRendererProps {
  src?: string;
  alt?: string;
  className?: string;
  compact?: boolean;
}

export function ImageRenderer({ src, alt, className = '', compact = false }: ImageRendererProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!src) return null;

  if (error) {
    return (
      <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 text-sm font-mono">
        Image unavailable
      </div>
    );
  }

  const isRemote = src.startsWith('http');
  const finalSrc = isRemote ? src : `${import.meta.env.BASE_URL || ''}${src}`;

  return (
    <figure className={`my-4 relative group ${className}`}>
      <div className={`overflow-hidden rounded-xl bg-white/80 dark:bg-slate-950/70 ${compact ? "max-h-[min(24dvh,13rem)]" : "max-h-[min(36dvh,24rem)]"}`}>
        <img 
        src={finalSrc} 
        alt={alt || 'Image'}
        className={`
          h-full w-full rounded-xl border border-gray-200 bg-slate-50 object-contain dark:border-gray-700 dark:bg-slate-900
          transition-opacity duration-300
          ${loading ? 'opacity-0' : 'opacity-100'}
        `}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        />
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}
      
      {alt && (
        <figcaption className="mt-2 text-center text-xs italic text-gray-500 dark:text-gray-400">{alt}</figcaption>
      )}
    </figure>
  );
}
