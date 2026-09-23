import type { ReactNode } from 'react';

type SkeletonProps = React.HTMLAttributes<HTMLSpanElement> & { width?: string | number; height?: string | number; rounded?: 'sm' | 'md' | 'lg' | 'pill' };

export function Skeleton({ width, height, rounded = 'md', className = '', style, ...props }: SkeletonProps) {
  const radius = { sm: 'rounded', md: 'rounded-lg', lg: 'rounded-xl', pill: 'rounded-full' }[rounded];
  return <span aria-hidden="true" className={`app-skeleton ${radius} ${className}`} style={{ width, height, ...style }} {...props} />;
}

export function AppLoading({ label = 'Loading', children }: { label?: string; children?: ReactNode }) {
  return <div aria-label={label} className="app-loading-shell" role="status">{children || <div className="app-loading-layout" aria-hidden="true"><Skeleton width="2.75rem" height="2.75rem" rounded="pill" /><div className="min-w-0 flex-1 space-y-3"><Skeleton className="max-w-[12rem]" height="1rem" /><Skeleton className="max-w-[20rem]" height="0.75rem" /></div></div>}</div>;
}

export function PageSkeleton() {
  return <div className="app-page space-y-6" aria-hidden="true">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1 space-y-3"><Skeleton className="max-w-[7rem]" height="0.7rem" /><Skeleton className="max-w-[22rem]" height="2rem" rounded="lg" /><Skeleton className="max-w-[34rem]" height="0.8rem" /></div><Skeleton className="w-full sm:w-32" height="2.75rem" rounded="lg" /></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div className="app-skeleton-card" key={item}><Skeleton width="2rem" height="2rem" rounded="lg" /><Skeleton className="max-w-[7rem]" height="0.75rem" /><Skeleton className="max-w-[5rem]" height="1.75rem" /></div>)}</div>
    <div className="app-surface space-y-4 p-4 sm:p-6"><Skeleton className="max-w-[13rem]" height="1.25rem" /><Skeleton className="w-full" height="0.8rem" />{[1, 2, 3, 4, 5].map((item) => <Skeleton className="w-full" height="2.5rem" key={item} rounded="lg" />)}</div>
  </div>;
}
