import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="32" height="32" rx="8" className="fill-foreground" />
            <path
                d="M16 6L24 10.5V17.5C24 22 20.5 25 16 26.5C11.5 25 8 22 8 17.5V10.5L16 6Z"
                className="stroke-background"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12.5 16.5L15 19L19.5 13.5"
                className="stroke-background"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

