import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface ResilientArtworkProps {
  src: string;
  alt: string;
  title: string;
  className?: string;
}

export function ResilientArtwork({ src, alt, title, className = '' }: ResilientArtworkProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#E9EDE9] dark:bg-[#1B2421] text-[#4A5854] dark:text-[#98ABA5] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <BookOpen className="w-8 h-8 mb-2 opacity-60" strokeWidth={1.5} />
        <span className="font-editorial text-sm font-medium">{title}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
