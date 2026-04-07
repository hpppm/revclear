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
      className={`brand-button-primary grid shrink-0 place-items-center text-center shadow-md ${sizeClasses[size].container} ${className}`}
      aria-hidden="true"
    >
      <span
        className={`block font-bold text-white leading-none ${sizeClasses[size].label} ${labelClassName}`}
      >
        {label}
      </span>
    </div>
  );
}
