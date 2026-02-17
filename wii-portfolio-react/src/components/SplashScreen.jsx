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

    // Smart Asset Preloading
    useEffect(() => {
        if (!channels) return;

        // 1. Critical UI Assets (Must load before entering)
        const criticalImages = [
            '/assets/bg-pattern.png',
            '/assets/channel-border.png',
            '/assets/cursor.png',
            '/assets/channel-spritesheet.png',
            '/assets/bottom-bg.png',
            '/assets/bottom-title.png',
            '/assets/return.gif',
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

        // Channel art images (what each channel.html iframe displays)
        const channelArtImages = [
            '/channelart/aboutme/channel.jpg',
            '/channelart/credit-survey/channel.jpg',
            '/channelart/credit-website/channel.jpg',
            '/channelart/research-agent/channel.jpg',
            '/channelart/resume/channel.jpg',
            '/channelart/tuftes-razor/channel.jpg',
            '/channelart/mii/miis.png',
            '/channelart/disc/disc.png',
            '/channelart/photo/bg.png',
            '/channelart/photo/fore.png',
            '/channelart/photo/backleft.png',
            '/channelart/photo/backright.png',
        ];

        const criticalAudio = [
            '/audio/startup.mp3',
            '/audio/button-hover.mp3',
            '/audio/button-select.mp3',
            '/audio/button-select-big.mp3',
            '/audio/nextprev.mp3',
            '/audio/home-in.mp3',
            '/audio/home-out.mp3'
        ];

        const fonts = ['Regular', 'Bold', 'TitleBold', 'TitleMed', 'Display'];

        // 2. Helper Functions
        const loadImage = (src) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => {
                console.warn(`Failed to load image: ${src}`);
                resolve(src);
            };
            img.src = src;
        });

        const loadVideo = (src) => new Promise((resolve) => {
            if (['mp4', 'webm', 'ogg', 'mov'].some(ext => src.endsWith(ext))) {
                const vid = document.createElement('video');
                vid.preload = 'auto';
                vid.muted = true;
                vid.oncanplaythrough = () => resolve(src);
                vid.onerror = () => {
                    console.warn(`Failed to load video: ${src}`);
                    resolve(src);
                };
                vid.src = src;
                vid.load();
                // Timeout: don't wait more than 5s per video
                setTimeout(() => resolve(src), 5000);
            } else {
                // GIF or image format
                const img = new Image();
                img.onload = () => resolve(src);
                img.onerror = () => resolve(src);
                img.src = src;
            }
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
            setTimeout(() => resolve(src), 1500); // 1.5s timeout for critical audio
        });

        const loadFont = (fontFamily) => document.fonts.load(`1em ${fontFamily}`).catch(() => { });

        // 3. Build channel asset promises (videos, audio, channel HTML pages)
        const channelAssetPromises = channels.flatMap(channel => {
            const promises = [];

            // Channel preview video/image
            const format = channel.videoformat || 'gif';
            const videoSrc = `/${channel.assets}${channel.id}/video.${format}`;
            promises.push(loadVideo(videoSrc));

            // Channel audio
            const audioFormat = channel.audioformat || 'mp3';
            const audioSrc = `/${channel.assets}${channel.id}/audio.${audioFormat}`;
            promises.push(loadAudio(audioSrc));

            // Pre-fetch channel HTML so iframe renders faster
            const htmlSrc = `/${channel.channelart}${channel.id}/channel.html`;
            promises.push(fetch(htmlSrc).catch(() => { }));

            return promises;
        });

        // Channel art webm videos (github, linkedin)
        const channelArtVideos = [
            '/channelart/github/github.webm',
            '/channelart/linkedin/Linkedin Icon.webm',
        ];

        // 4. Execution — load everything during splash
        const loadCritical = async () => {
            const allPromises = [
                // Critical UI assets
                ...criticalImages.map(loadImage),
                ...criticalAudio.map(loadAudio),
                ...fonts.map(loadFont),
                // Channel art images
                ...channelArtImages.map(loadImage),
                // Channel art videos
                ...channelArtVideos.map(loadVideo),
                // Channel preview videos, audio, and HTML
                ...channelAssetPromises,
                // Min 500ms splash show
                new Promise(r => setTimeout(r, 500))
            ];

            // Race all assets against an 8s max timeout
            try {
                await Promise.race([
                    Promise.allSettled(allPromises),
                    new Promise(r => setTimeout(r, 8000))
                ]);
            } catch (e) {
                console.error("Asset loading error:", e);
            } finally {
                setAssetsReady(true);
            }
        };

        loadCritical();
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
