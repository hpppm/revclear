"use client";

import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({
  className = "",
  width,
  height,
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height)
    style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`animate-shimmer rounded ${className}`}
      style={style}
    />
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 mb-4 pb-2" style={{ borderBottom: '1px solid var(--rc-border)' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 py-3"
          style={{ borderBottom: '1px solid var(--rc-border)' }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
