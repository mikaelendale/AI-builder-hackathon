import { Monitor, Moon, Sun } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppearance } from '@/hooks/use-appearance';

export function ThemeToggle({ className = '' }: { className?: string }) {
    const { appearance, resolvedAppearance, updateAppearance } = useAppearance();

    const toggleTheme = () => {
        if (appearance === 'dark' || (appearance === 'system' && resolvedAppearance === 'dark')) {
            updateAppearance('light');
        } else {
            updateAppearance('dark');
        }
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleTheme}
                    className={`h-8 w-8 rounded-lg border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white transition-all shadow-xs ${className}`}
                >
                    {resolvedAppearance === 'dark' ? (
                        <Sun className="h-4 w-4 text-amber-400 transition-all" />
                    ) : (
                        <Moon className="h-4 w-4 text-indigo-600 transition-all" />
                    )}
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                <p className="text-xs">
                    Switch to {resolvedAppearance === 'dark' ? 'Light' : 'Dark'} Mode
                </p>
            </TooltipContent>
        </Tooltip>
    );
}
