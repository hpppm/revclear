import React from "react";

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

export default function SectionHeader({ title, subtitle, action, className = "" }: SectionHeaderProps) {
    return (
        <div className={`flex items-center justify-between ${className}`}>
            <div>
                <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
