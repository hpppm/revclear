"use client";

export default function Card({ children, className = "", header = null }) {
  const baseClasses = "panel"; // Reusing the .panel styles from globals.css

  return (
    <article className={`${baseClasses} ${className}`}>
      {header && (
        <header className="panel-heading mb-4">
          {header}
        </header>
      )}
      {children}
    </article>
  );
}
