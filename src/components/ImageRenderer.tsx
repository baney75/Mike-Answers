import { useState } from 'react';

interface ImageRendererProps {
  src?: string;
  alt?: string;
  className?: string;
}

export function ImageRenderer({ src, alt, className = '' }: ImageRendererProps) {
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
    <div className={`my-4 relative group ${className}`}>
      <img 
        src={finalSrc} 
        alt={alt || 'Image'}
        className={`
          rounded-xl shadow-md border border-gray-200 dark:border-gray-700 w-full object-cover
          transition-opacity duration-300
          ${loading ? 'opacity-0' : 'opacity-100'}
        `}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
      />
      
      {loading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}
      
      {alt && (
        <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400 italic">{alt}</p>
      )}
    </div>
  );
}