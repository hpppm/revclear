import Link from "next/link";
import React from "react";

interface BackButtonProps {
  href: string;
  children?: React.ReactNode;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ href, children, className }) => {
  return (
    <Link
      href={href}
      className={`inline-flex items-center text-blue-600 hover:text-blue-700 font-medium ${className}`}
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {children || "Back"}
    </Link>
  );
};

export default BackButton;
