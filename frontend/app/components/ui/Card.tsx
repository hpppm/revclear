import React from "react";

interface CardProps {
    header?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export default function Card({ header, footer, children, className = "" }: CardProps) {
    return (
        <section className={`rounded-md border border-slate-300 bg-white ${className}`}>
            {header && (
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    {typeof header === "string" ? (
                        <h2 className="text-sm font-semibold text-slate-900">{header}</h2>
                    ) : (
                        header
                    )}
                </div>
            )}
            <div className="p-4">{children}</div>
            {footer && <div className="border-t border-slate-200 px-4 py-3">{footer}</div>}
        </section>
    );
}
