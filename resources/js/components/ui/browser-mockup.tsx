import React from 'react';
import { Lock } from 'lucide-react';

interface BrowserMockupProps {
    url?: string;
    children: React.ReactNode;
    className?: string;
    badgeText?: string;
}

export function BrowserMockup({
    url = 'https://sequa.org/audit-engine',
    children,
    className = '',
    badgeText,
}: BrowserMockupProps) {
    return (
        <div className={`rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden ${className}`}>
            {/* Minimalist Browser Chrome Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/40 text-xs">
                <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-border" />
                    <span className="size-2 rounded-full bg-border" />
                    <span className="size-2 rounded-full bg-border" />
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-background/80 border border-border/60 text-[11px] font-mono text-muted-foreground w-full max-w-[280px] sm:max-w-[340px] justify-center mx-2">
                    <Lock className="w-2.5 h-2.5 text-muted-foreground/70" />
                    <span className="truncate">{url}</span>
                </div>

                <div className="flex items-center gap-2">
                    {badgeText ? (
                        <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-sm">
                            {badgeText}
                        </span>
                    ) : (
                        <div className="w-10" />
                    )}
                </div>
            </div>

            {/* Inner Content Area */}
            <div className="relative">
                {children}
            </div>
        </div>
    );
}
