import React from 'react';

export function WavyUnderline({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <span className="relative inline-block whitespace-nowrap">
            <span>{children}</span>
            <svg
                className="absolute left-0 bottom-[-4px] w-full h-[6px] overflow-visible pointer-events-none text-foreground/40 dark:text-foreground/30"
                viewBox="0 0 100 8"
                preserveAspectRatio="none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M0 4 C 10 0, 15 8, 25 4 C 35 0, 40 8, 50 4 C 60 0, 65 8, 75 4 C 85 0, 90 8, 100 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
}

export function CircleHighlight({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <span className="relative inline-block px-1.5 py-0.5 mx-0.5">
            <span className="relative z-10">{children}</span>
            <svg
                className="absolute inset-0 w-full h-full -top-1 -left-1 -right-1 -bottom-1 pointer-events-none overflow-visible text-foreground/25 dark:text-foreground/20"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M 10 20 C 10 8, 90 6, 92 20 C 94 34, 8 36, 6 22 C 5 14, 20 8, 40 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </span>
    );
}

export function MarkerHighlight({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <mark className={`bg-muted text-foreground border border-border/80 px-1.5 py-0.5 rounded-md font-inherit ${className}`}>
            {children}
        </mark>
    );
}

export function AccentUnderline({ children }: { children: React.ReactNode }) {
    return (
        <span className="relative inline-block border-b-2 border-foreground/30 pb-0.5">
            {children}
        </span>
    );
}

// Backward compatibility
export const TerracottaUnderline = AccentUnderline;
