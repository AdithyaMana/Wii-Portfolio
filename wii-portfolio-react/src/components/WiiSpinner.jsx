// The Wii's "please wait" ring: eight capsules around a circle that light
// up one after another, each fading as the next one turns on
const DOTS = 8;

export function WiiSpinner({ size = '8vh', className = '' }) {
    return (
        <svg
            className={`wii-spinner ${className}`.trim()}
            viewBox="-50 -50 100 100"
            width={size}
            height={size}
            role="img"
            aria-label="Loading"
        >
            {Array.from({ length: DOTS }, (_, i) => (
                <rect
                    key={i}
                    x="-6.5"
                    y="-44"
                    width="13"
                    height="24"
                    rx="6.5"
                    transform={`rotate(${(360 / DOTS) * i})`}
                    style={{ animationDelay: `${(i - DOTS) * (0.9 / DOTS)}s` }}
                />
            ))}
        </svg>
    );
}
