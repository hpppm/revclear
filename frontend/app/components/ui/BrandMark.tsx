interface BrandMarkProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  labelClassName?: string;
}

const sizeClasses = {
  sm: {
    container: "h-8 w-8 rounded-md",
    label: "text-lg",
  },
  md: {
    container: "h-10 w-10 rounded-xl",
    label: "text-xl",
  },
  lg: {
    container: "h-12 w-12 rounded-xl",
    label: "text-2xl",
  },
};

export function BrandMark({
  label = "R",
  size = "md",
  className = "",
  labelClassName = "",
}: BrandMarkProps) {
  return (
    <div
      className={`grid shrink-0 place-items-center text-center ${sizeClasses[size].container} ${className}`}
      style={{
        background: 'var(--rc-teal)',
        boxShadow: '0 4px 14px rgba(0, 212, 184, 0.35)',
      }}
      aria-hidden="true"
    >
      <span
        className={`block font-bold leading-none font-mono ${sizeClasses[size].label} ${labelClassName}`}
        style={{ color: 'var(--rc-deep)' }}
      >
        {label}
      </span>
    </div>
  );
}
