import React from "react";

interface CardProps {
    header?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export default function Card({ header, footer, children, className = "" }: CardProps) {
    return (
        <section className={`rounded-xl glass-card ${className}`}>
            {header && (
                <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--rc-border)' }}>
                    {typeof header === "string" ? (
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--rc-text-primary)' }}>{header}</h2>
                    ) : (
                        header
                    )}
                </div>
            )}
            <div className="p-6">{children}</div>
            {footer && <div className="px-6 py-4" style={{ borderTop: '1px solid var(--rc-border)' }}>{footer}</div>}
        </section>
    );
}
