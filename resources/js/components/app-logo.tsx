import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-xs">
                sq
            </div>
            <div className="ml-2 grid flex-1 text-left text-xs">
                <span className="truncate leading-tight font-semibold tracking-tight text-foreground">
                    sequa Ethiopia
                </span>
                <span className="truncate text-[10px] leading-tight text-muted-foreground font-mono">
                    SICP Verification Ledger
                </span>
            </div>
        </>
    );
}

