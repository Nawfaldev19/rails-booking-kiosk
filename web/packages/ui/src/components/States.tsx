// Loading skeletons and empty states for page-level data views.
import type { ReactNode } from 'react';

function Skeleton({ height = 20, width = '100%' }: { height?: number; width?: number | string }) {
  return <div className="k-skeleton" style={{ height, width }} aria-hidden="true" />;
}

/** A labelled loading placeholder made of several skeleton lines. */
export function LoadingBlock({
  label,
  lines = 4,
}: {
  /** What is loading, read out by screen readers (the block is a `status` region). */
  label: string;
  /** How many skeleton lines to draw. @defaultValue `4` */
  lines?: number;
}) {
  return (
    <div className="k-stack" role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={i === 0 ? 28 : 44} width={i === 0 ? '40%' : '100%'} />
      ))}
    </div>
  );
}

/** What a list shows when it has nothing in it, with an optional next step. */
export function EmptyState({
  title,
  children,
  icon,
}: {
  /** A short heading (`h2`), such as "No bookings yet". */
  title: string;
  /** An explanation or a link to the next step. */
  children?: ReactNode;
  /** A decorative icon above the heading. */
  icon?: ReactNode;
}) {
  return (
    <div className="k-empty">
      {icon}
      <h2>{title}</h2>
      {children}
    </div>
  );
}
