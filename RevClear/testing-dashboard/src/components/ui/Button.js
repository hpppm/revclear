"use client";

import styles from './Button.module.css'; // New import

export default function Button({ children, onClick, disabled, variant = "default", type = "button", className = "", noTransition = false }) {
  let variantClasses = "";

  switch (variant) {
    case "primary":
      variantClasses = styles.primary;
      break;
    case "cyan":
      variantClasses = styles.cyan;
      break;
    case "danger": // Assuming a 'danger' variant based on TranscribePanel.js usage
      variantClasses = styles.danger;
      break;
    case "secondary":
      variantClasses = styles.secondary;
      break;
    default:
      variantClasses = "";
  }

  // Combine module classes with any additional classes passed via props
  const finalClassName = `${styles.button} ${variantClasses} ${className} ${noTransition ? styles.noTransition : ''}`.trim();

  return (
    <button
      className={finalClassName}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}
