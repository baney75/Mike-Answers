import { useState } from 'react';
import { Play, X, ExternalLink } from 'lucide-react';
import { getYouTubeThumbnail, getYouTubeEmbedUrl } from '../services/search';

interface VideoEmbedProps {
  videoId: string;
  title?: string;
  channelTitle?: string;
  compact?: boolean;
}

export function VideoEmbed({ videoId, title, channelTitle, compact = false }: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const frameHeightClass = compact ? "max-h-[min(24dvh,13rem)]" : "max-h-[min(34dvh,20rem)]";

  if (isPlaying) {
    return (
      <div className="my-4 relative mx-auto w-full max-w-3xl">
        <div className={`relative aspect-video w-full overflow-hidden rounded-xl border-2 border-gray-900 dark:border-gray-100 neo-shadow ${frameHeightClass}`}>
          <iframe
            src={`${getYouTubeEmbedUrl(videoId)}?autoplay=1&modestbranding=1&rel=0&playsinline=1`}
            title={title || 'YouTube video'}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-same-origin allow-scripts allow-presentation"
            allowFullScreen
          />
        </div>
        <button
          type="button"
          onClick={() => setIsPlaying(false)}
          className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
          Stop playing
        </button>
      </div>
    );
  }

  return (
    <div className="my-4 relative group mx-auto w-full max-w-3xl">
      <button
        type="button"
        className={`relative aspect-video w-full overflow-hidden rounded-xl border-2 border-gray-900 dark:border-gray-100 neo-shadow cursor-pointer text-left ${frameHeightClass}`}
        onClick={() => setIsPlaying(true)}
        aria-label={`Play video: ${title || 'YouTube video'}`}
      >
        <img
          src={getYouTubeThumbnail(videoId, 'high')}
          alt={title || 'Video thumbnail'}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="rounded-full bg-(--aqs-accent) p-4 shadow-lg transition-transform group-hover:scale-110">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
      </button>
      {(title || channelTitle) && (
        <div className="mt-2">
          {title && <p className={`${compact ? "text-xs" : "text-sm"} font-medium text-gray-900 dark:text-gray-100`}>{title}</p>}
          {channelTitle && <p className="text-xs text-gray-500 dark:text-gray-400">{channelTitle}</p>}
        </div>
      )}
      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-xs text-(--aqs-accent) hover:underline dark:text-(--aqs-accent-dark)"
      >
        <ExternalLink className="w-3 h-3" />
        Watch on YouTube
      </a>
    </div>
  );
}
