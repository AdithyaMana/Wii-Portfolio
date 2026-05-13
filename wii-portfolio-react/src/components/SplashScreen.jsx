import { useState, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';
import { useChannels } from '../context/ChannelsContext';

export function SplashScreen({ onComplete }) {
    const [showWarning, setShowWarning] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    const [canClick, setCanClick] = useState(false);
    const [progress, setProgress] = useState(0);
    const { playSFX } = useAudio();
    const { config } = useConfig();
    const { channels } = useChannels();
    const [assetsReady, setAssetsReady] = useState(false);
    const completedRef = useRef(0);
    const totalRef = useRef(0);

    useEffect(() => {
        if (!channels) return;

        // ── CRITICAL (blocks the click) ──────────────────────────────
        // Fonts + key UI images + the SFX needed before any interaction
        const criticalImages = [
            '/assets/bg-pattern.png',
            '/assets/channel-border.png',
            '/assets/cursor.png',
            '/assets/channel-spritesheet.png',
            '/assets/bottom-bg.png',
            '/assets/bottom-title.png',
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
            '/assets/back.png',
            '/assets/mii-avatar.png',
            '/channelart/disc/disc.png',
        ];

        const criticalAudio = [
            '/audio/startup.mp3',
            '/audio/button-hover.mp3',
            '/audio/button-select.mp3',
            '/audio/button-select-big.mp3',
            '/audio/nextprev.mp3',
        ];

        const fonts = ['Regular', 'Bold', 'TitleBold', 'TitleMed', 'Display'];

        // ── BACKGROUND (non-blocking, starts immediately) ────────────
        // Channel videos, audio, art — large files, fire and forget
        const backgroundLoad = () => {
            const channelArtImages = [
                '/channelart/credit-survey/channel.jpg',
                '/channelart/credit-website/channel.jpg',
                '/channelart/research-agent/channel.jpg',
                '/channelart/resume/channel.jpg',
                '/channelart/tuftes-razor/channel.jpg',
                '/channelart/mii/miis.png',
            ];

            const channelArtVideos = [
                '/channelart/github/github.webm',
                '/channelart/linkedin/Linkedin Icon.webm',
            ];

            channelArtImages.forEach(src => { const i = new Image(); i.src = src; });
            channelArtVideos.forEach(src => {
                const v = document.createElement('video');
                v.preload = 'auto'; v.muted = true; v.src = src; v.load();
            });

            channels.forEach(channel => {
                // Channel preview video
                const format = channel.videoformat || 'gif';
                const videoSrc = `/${channel.assets}${channel.id}/video.${format}`;
                if (['mp4', 'webm', 'ogg', 'mov'].includes(format)) {
                    const v = document.createElement('video');
                    v.preload = 'auto'; v.muted = true; v.src = videoSrc; v.load();
                } else {
                    const i = new Image(); i.src = videoSrc;
                }

                // Channel audio
                const audioFormat = channel.audioformat || 'mp3';
                const a = new Audio();
                a.preload = 'auto';
                a.src = `/${channel.assets}${channel.id}/audio.${audioFormat}`;
                a.load();

                // Channel HTML prefetch
                fetch(`/${channel.channelart}${channel.id}/channel.html`).catch(() => {});
            });
        };

        // ── Helpers ──────────────────────────────────────────────────
        const tick = () => {
            completedRef.current += 1;
            const pct = Math.round((completedRef.current / totalRef.current) * 100);
            setProgress(Math.min(pct, 100));
        };

        const loadImage = (src) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { tick(); resolve(); };
            img.onerror = () => { tick(); resolve(); };
            img.src = src;
        });

        const loadAudio = (src) => new Promise((resolve) => {
            const audio = new Audio();
            const done = () => { tick(); resolve(); };
            audio.oncanplaythrough = done;
            audio.onerror = done;
            audio.src = src;
            audio.load();
            setTimeout(done, 1500);
        });

        const loadFont = (family) =>
            document.fonts.load(`1em ${family}`).then(tick).catch(tick);

        // ── Execute ──────────────────────────────────────────────────
        const criticalCount = criticalImages.length + criticalAudio.length + fonts.length;
        totalRef.current = criticalCount;
        completedRef.current = 0;

        // Fire background loads immediately — don't await them
        backgroundLoad();

        const criticalPromises = [
            ...criticalImages.map(loadImage),
            ...criticalAudio.map(loadAudio),
            ...fonts.map(loadFont),
            new Promise(r => setTimeout(r, 400)),
        ];

        // Only wait for critical assets (max 4s)
        Promise.race([
            Promise.allSettled(criticalPromises),
            new Promise(r => setTimeout(r, 4000)),
        ]).finally(() => {
            setProgress(100);
            setAssetsReady(true);
        });
    }, [channels]);

    useEffect(() => {
        if (!assetsReady) return;

        const skipWarn = window.location.search.includes('skipwarn');
        if (skipWarn) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowWarning(false);
            setShowWelcome(true);
            const t = setTimeout(() => onComplete(), 200);
            return () => clearTimeout(t);
        } else {
            const t = setTimeout(() => setCanClick(true), 200);
            return () => clearTimeout(t);
        }
    }, [onComplete, assetsReady]);

    const handleClick = () => {
        if (!canClick || !assetsReady) return;
        playSFX('button-select.mp3', config.sfxVol);
        setShowWarning(false);
        setTimeout(() => onComplete(), 100);
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
                        </div>

                        {canClick ? (
                            <span style={{ opacity: 1 }}>Press left click to continue.</span>
                        ) : (
                            <div className="splash-loading">
                                <div className="splash-progress-bar">
                                    <div
                                        className="splash-progress-fill"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="splash-loading-text">Loading assets... {progress}%</span>
                            </div>
                        )}

                        <p className="splash-credit">built by adi · <a href="https://akiraux.vercel.app" target="_blank" rel="noopener noreferrer">akiraux.vercel.app</a></p>
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
