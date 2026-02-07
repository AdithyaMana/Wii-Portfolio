import { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';
import { useChannels } from '../context/ChannelsContext';

export function SplashScreen({ onComplete }) {
    const [showWarning, setShowWarning] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    const [canClick, setCanClick] = useState(false);
    const { playSFX } = useAudio();
    const { config } = useConfig();
    const { channels } = useChannels();

    const [assetsReady, setAssetsReady] = useState(false);

    // Preload assets while waiting on splash screen
    useEffect(() => {
        if (!channels) return;

        // Critical assets needed for initial render (prioritized)
        const criticalAssets = [
            '/assets/bg-pattern.png',
            '/assets/channel-border.png',
            '/assets/cursor.png',
            '/assets/channel-spritesheet.png',
            '/assets/bottom-bg.png',
            '/assets/bottom-title.png'
        ];

        // Secondary assets (loaded after critical)
        const secondaryAssets = [
            '/assets/channel-hover.png',
            '/assets/wii-logo.svg',
            '/assets/wii-circle-button.png',
            '/assets/mail-circle-button.png',
            '/assets/nav-arrow-left.png',
            '/assets/nav-arrow-right.png',
            '/assets/prev-default.png',
            '/assets/next-default.png',
            '/assets/wii-menu-button.png',
            '/assets/start-button.png'
        ];

        // Critical audio (needed immediately after splash)
        const criticalAudio = [
            '/audio/startup.mp3',
            '/audio/button-hover.mp3',
            '/audio/button-select.mp3'
        ];

        // Helper function to load an image with Promise
        const loadImage = (src) => new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve; // Don't block on errors
            img.src = src;
        });

        // Helper function to preload audio
        const loadAudio = (src) => new Promise((resolve) => {
            const audio = new Audio();
            // trigger load
            audio.preload = 'auto';
            audio.oncanplaythrough = resolve;
            audio.onerror = resolve;
            audio.src = src;
            audio.load();

            // Timeout fallback for audio
            setTimeout(resolve, 3000);
        });

        // Helper function to preload video
        const loadVideo = (src) => new Promise((resolve) => {
            const vid = document.createElement('video');
            vid.preload = 'auto';
            vid.muted = true;
            vid.playsInline = true;

            vid.oncanplaythrough = resolve;
            vid.onerror = resolve;

            vid.src = src;
            vid.load();

            // Timeout fallback to prevent infinite loading state
            setTimeout(resolve, 5000);
        });

        // Load ALL assets (Critical + All Channels)
        const loadAllAssets = async () => {
            // 1. Gather all asset promises
            const assetPromises = [
                ...criticalAssets.map(loadImage),
                ...secondaryAssets.map(loadImage), // Load these now too
                ...criticalAudio.map(loadAudio)
            ];

            // 2. Add all channel assets
            channels.forEach(channel => {
                // Channel Audio
                const audioFormat = channel.audioformat || 'mp3';
                const audioSrc = `/${channel.assets}${channel.id}/audio.${audioFormat}`;
                assetPromises.push(loadAudio(audioSrc));

                // Channel Video/GIF
                const format = channel.videoformat || 'gif';
                const videoSrc = `/${channel.assets}${channel.id}/video.${format}`;

                if (['mp4', 'webm', 'ogg', 'mov'].includes(format)) {
                    assetPromises.push(loadVideo(videoSrc));
                } else {
                    assetPromises.push(loadImage(videoSrc));
                }
            });

            // 3. Wait for EVERYONE
            await Promise.all(assetPromises);

            // 4. Mark ready
            setAssetsReady(true);
        };

        loadAllAssets();
    }, [channels]);

    useEffect(() => {
        if (!assetsReady) return;

        // Check for skipwarn
        const skipWarn = window.location.search.includes('skipwarn');

        if (skipWarn) {
            setShowWarning(false);
            setShowWelcome(true);
            const timer = setTimeout(() => {
                onComplete();
            }, 200); // Reduced from 500ms
            return () => clearTimeout(timer);
        } else {
            // Allow interaction once assets are ready with minimal delay
            const timer = setTimeout(() => {
                setCanClick(true);
            }, 300); // Reduced from 800ms
            return () => clearTimeout(timer);
        }
    }, [onComplete, assetsReady]);

    const handleClick = () => {
        if (!canClick || !assetsReady) return;

        playSFX('button-select.mp3', config.sfxVol);
        setShowWarning(false);

        // Wait 0.1 seconds then complete
        setTimeout(() => {
            onComplete();
        }, 100);
    };

    if (!showWarning && !showWelcome) {
        return (
            <div className="splash" style={{ opacity: 0, transition: 'opacity 1s' }}>
                <div className="warning disabled"></div>
            </div>
        );
    }

    return (
        <div className="splash">
            {showWarning && (
                <div className="warning" onClick={handleClick}>
                    <div className="warning-container">
                        <div className="text">
                            <h2>
                                <div className="warn-icon">⚠&nbsp;</div>
                                WARNING - DEVICE COMPATIBILITY
                            </h2>
                            <p className="desc">
                                FOR THE BEST EXPERIENCE, PLEASE VIEW THIS WEBSITE
                                ON A DESKTOP OR LAPTOP COMPUTER. MOBILE DEVICES
                                MAY NOT DISPLAY CONTENT CORRECTLY.
                            </p>
                            <p className="bottom">
                                Wii Health & Safety Info at<br />
                                <a href="https://www.nintendo.com/health-and-safety/" target="_blank" rel="noopener noreferrer">www.nintendo.com/health-and-safety/</a>
                            </p>
                        </div>
                        {canClick ? (
                            <span style={{ opacity: 1 }}>Press left click to continue.</span>
                        ) : (
                            <span style={{ animation: 'none', opacity: 0.5 }}>Loading assets...</span>
                        )}
                    </div>
                </div>
            )}

            {showWelcome && (
                <div className="welcomeback">
                    <img src="/assets/return.gif" className="channels" alt="Loading" />
                    <span className="tip">
                        <strong>PRO TIP:</strong>&nbsp;Right-click to open the Wii pause menu
                    </span>
                </div>
            )}
        </div>
    );
}
