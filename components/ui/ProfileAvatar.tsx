import { ImgHTMLAttributes, useEffect, useState } from 'react';
import { documentUrl } from '../../lib/backend';
import { driveImageCandidates } from '../../lib/googleDrive';

export default function ProfileAvatar({ src, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [url, setUrl] = useState('/avatar-placeholder.svg');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => {
    let active = true;
    setUrl('/avatar-placeholder.svg');
    setCandidates([]);
    setCandidateIndex(0);
    if (src) void documentUrl(src).then(value => {
      if (!active) return;
      const next = value && value.startsWith('http') ? driveImageCandidates(value) : [value];
      setCandidates(next);
      setUrl(next[0] || '/avatar-placeholder.svg');
    }).catch(error => {
      console.error('[ProfileAvatar] image URL resolution failed', {
        source: src || '(empty)',
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
    });
    return () => { active = false; };
  }, [src]);
  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const nextIndex = candidateIndex + 1;
    if (nextIndex < candidates.length) {
      setCandidateIndex(nextIndex);
      setUrl(candidates[nextIndex]);
      return;
    }
    const image = event.currentTarget;
    console.error('[ProfileAvatar] image preview failed', {
      source: src || '(empty)',
      attemptedUrl: image.currentSrc || image.src || '(empty)',
      candidates,
      failedCandidateIndex: candidateIndex,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      complete: image.complete,
      alt: image.alt,
      message: 'The browser could not load any candidate image URL. Check the attemptedUrl directly and verify the Drive file is shared as Anyone with the link.',
    });
    void Promise.all(candidates.map(async candidate => {
      try {
        const response = await fetch(candidate, {
          method: 'HEAD',
          mode: 'cors',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
        });
        return {
          url: candidate,
          reachable: response.ok,
          status: response.status,
          statusText: response.statusText,
          responseType: response.type,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
        };
      } catch (error) {
        return {
          url: candidate,
          reachable: false,
          fetchErrorName: error instanceof Error ? error.name : typeof error,
          fetchErrorMessage: error instanceof Error ? error.message : String(error),
        };
      }
    })).then(results => {
      console.error('[ProfileAvatar] browser URL diagnostics', results);
    });
    setUrl('/avatar-placeholder.svg');
  };
  return <img {...props} src={url} alt={alt} referrerPolicy={props.referrerPolicy || 'no-referrer'} onError={handleError} />;
}
