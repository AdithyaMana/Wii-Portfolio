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

    // Preload ALL assets before allowing entry
    useEffect(() => {
        if (!channels) return;

        // 1. Define ALL assets to preload
        const images = [
            // Critical UI
            '/assets/bg-pattern.png',
            '/assets/channel-border.png',
            '/assets/cursor.png',
            '/assets/channel-spritesheet.png',
            '/assets/bottom-bg.png',
            '/assets/bottom-title.png',
            '/assets/return.gif',

            // Channel/Menu UI
            '/assets/channel-hover.png',
            '/assets/wii-logo.svg',
            '/assets/wii-circle-button.png',
            '/assets/mail-circle-button.png',
            '/assets/nav-arrow-left.png',
            '/assets/nav-arrow-right.png',
            '/assets/prev-default.png',
            '/assets/prev-hover.png',
            '/assets/next-default.png',
            '/assets/next-hover.png',
            '/assets/wii-menu-button.png',
            '/assets/start-button.png',
            '/assets/channel-wiilogo.png',
            '/channelart/disc/disc.png'
        ];

        const audioFiles = [
            // Critical Audio
            '/audio/startup.mp3',
            '/audio/button-hover.mp3',
            '/audio/button-select.mp3',
            '/audio/button-select-big.mp3',
            '/audio/nextprev.mp3',
            '/audio/home-in.mp3',
            '/audio/home-out.mp3'
        ];

        const fonts = [
            'Regular',
            'Bold',
            'TitleBold',
            'TitleMed',
            'Display'
        ];

        // 2. Helper loading functions
        const loadImage = (src) => new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => {
                console.warn(`Failed to partially load image: ${src}`);
                resolve(src); // Don't block entirely on one missing asset
            };
            img.src = src;
        });

        const loadAudio = (src) => new Promise((resolve) => {
            const audio = new Audio();
            audio.oncanplaythrough = () => resolve(src);
            audio.onerror = () => {
                console.warn(`Failed to load audio: ${src}`);
                resolve(src);
            };
            audio.src = src;
            audio.load();
            // Fallback if event doesn't fire quickly (e.g. cached/small files)
            setTimeout(() => resolve(src), 2000);
        });

        const loadFont = (fontFamily) => document.fonts.load(`1em ${fontFamily}`).catch(e => {
            console.warn(`Failed to load font: ${fontFamily}`, e);
        });

        const loadVideo = (src) => new Promise((resolve) => {
            const vid = document.createElement('video');
            vid.onloadeddata = () => resolve(src);
            vid.onerror = () => {
                console.warn(`Failed to load video: ${src}`);
                resolve(src);
            };
            vid.preload = 'auto';
            vid.muted = true;
            vid.src = src;
            vid.load();
            setTimeout(() => resolve(src), 3000); // 3s timeout for video
        });

        // 3. Orchestrate Loading
        const loadEverything = async () => {
            const config = {
                imagePromises: images.map(loadImage),
                audioPromises: audioFiles.map(loadAudio),
                fontPromises: fonts.map(loadFont)
            };

            // Add Channel Assets
            const channelAssets = [];
            channels.forEach(channel => {
                // Channel Audio
                const audioFormat = channel.audioformat || 'mp3';
                const audioSrc = `/${channel.assets}${channel.id}/audio.${audioFormat}`;
                channelAssets.push(loadAudio(audioSrc));

                // Channel Video/Image (Preview)
                const format = channel.videoformat || 'gif';
                const videoSrc = `/${channel.assets}${channel.id}/video.${format}`;

                if (['mp4', 'webm', 'ogg', 'mov'].includes(format)) {
                    channelAssets.push(loadVideo(videoSrc));
                } else {
                    channelAssets.push(loadImage(videoSrc));
                }
            });

            try {
                // Wait for all promises with a global timeout safety net
                await Promise.all([
                    ...config.imagePromises,
                    ...config.audioPromises,
                    ...config.fontPromises,
                    ...channelAssets,
                    // Minimum splash time to prevent flickering (500ms)
                    new Promise(r => setTimeout(r, 500))
                ]);
            } catch (err) {
                console.error("Asset loading error (non-fatal):", err);
            } finally {
                setAssetsReady(true);
            }
        };

        loadEverything();
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
