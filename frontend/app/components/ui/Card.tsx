import React from "react";

interface CardProps {
    header?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export default function Card({ header, footer, children, className = "" }: CardProps) {
    return (
        <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
            {header && (
                <div className="border-b border-slate-200 px-6 py-4">
                    {typeof header === "string" ? (
                        <h2 className="text-xl font-semibold text-slate-900">{header}</h2>
                    ) : (
                        header
                    )}
                </div>
            )}
            <div className="p-6">{children}</div>
            {footer && <div className="border-t border-slate-200 px-6 py-4">{footer}</div>}
        </section>
    );
}
