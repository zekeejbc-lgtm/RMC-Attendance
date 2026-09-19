import { ImgHTMLAttributes, useEffect, useState } from 'react';
import { documentUrl } from '../../lib/backend';

export default function ProfileAvatar({ src, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [url, setUrl] = useState('/avatar-placeholder.svg');
  useEffect(() => {
    let active = true;
    setUrl('/avatar-placeholder.svg');
    if (src) void documentUrl(src).then(value => { if (active) setUrl(value || '/avatar-placeholder.svg'); }).catch(() => undefined);
    return () => { active = false; };
  }, [src]);
  return <img {...props} src={url} alt={alt} onError={() => setUrl('/avatar-placeholder.svg')} />;
}
