import { useEffect, useRef } from 'react';

export function Cursor() {
    const cursorRef = useRef(null);

    useEffect(() => {
        const cursor = cursorRef.current;
        if (!cursor) return;

        // Initial style setup
        cursor.style.opacity = '0';

        // State to track cursor position
        let mouseX = -100;
        let mouseY = -100;
        let currentX = -100;
        let currentY = -100;
        let isVisible = false;
        let rafId = null;
        let initialized = false;

        const onMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            if (!initialized) {
                currentX = mouseX;
                currentY = mouseY;
                initialized = true;
            }

            if (!isVisible) {
                isVisible = true;
                cursor.style.opacity = '1';
            }
        };

        const onMouseEnter = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!initialized) {
                currentX = mouseX;
                currentY = mouseY;
                initialized = true;
            }
            isVisible = true;
            cursor.style.opacity = '1';
        };

        const onMouseLeave = () => {
            isVisible = false;
            cursor.style.opacity = '0';
        };

        // The render loop updates the DOM in sync with the browser's refresh rate
        const loop = () => {
            // Smoothly interpolate towards the target position
            // 0.25 provides a good balance between snappiness and smoothness
            const lerp = 0.25;
            currentX += (mouseX - currentX) * lerp;
            currentY += (mouseY - currentY) * lerp;

            // Using translate3d forces hardware acceleration
            // We use fixed digits to prevent unnecessary sub-pixel jitter in some browsers
            cursor.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
            rafId = requestAnimationFrame(loop);
        };

        // Start the loop
        loop();

        // Enable cursor hiding in CSS
        document.body.classList.add('custom-cursor-active');

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        document.body.addEventListener('mouseenter', onMouseEnter);
        document.body.addEventListener('mouseleave', onMouseLeave);

        return () => {
            cancelAnimationFrame(rafId);
            document.body.classList.remove('custom-cursor-active');
            window.removeEventListener('mousemove', onMouseMove);
            document.body.removeEventListener('mouseenter', onMouseEnter);
            document.body.removeEventListener('mouseleave', onMouseLeave);
        };
    }, []);

    return (
        <img
            ref={cursorRef}
            src="/assets/cursor.png"
            alt="cursor"
            style={{
                position: 'fixed',
                left: 0,
                top: 0,
                width: 'auto', // Ensure natural size
                height: 'auto',
                pointerEvents: 'none', // Click-through is essential
                zIndex: 2147483647, // Max z-index
                willChange: 'transform', // frequent updates expected
                transition: 'opacity 0.15s ease-out', // smooth fade only
                backfaceVisibility: 'hidden', // Optimize paint
                transformStyle: 'preserve-3d'
            }}
        />
    );
}
