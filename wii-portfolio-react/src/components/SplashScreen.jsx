import { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';
import { useChannels } from '../context/ChannelsContext';
import { artUrl, audioSrc, previewSrc } from '../channelArt';

export function SplashScreen({ onComplete }) {
    const [showWarning, setShowWarning] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    const [canClick, setCanClick] = useState(false);
    const { playSFX } = useAudio();
    const { config } = useConfig();
    const { channels } = useChannels();
    const [assetsReady, setAssetsReady] = useState(false);
    const [isTouch] = useState(() => window.matchMedia('(hover: none) and (pointer: coarse)').matches);

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
                '/channelart/credit-survey/channel.webp',
                '/channelart/credit-website/channel.webp',
                '/channelart/research-agent/channel.webp',
                '/channelart/resume/channel.webp',
                '/channelart/poster-row-tracker/channel.webp',
                '/channelart/tuftes-razor/channel.webp',
                '/channelart/overtone/channel.webp',
                '/channelart/betterposter/channel.webp',
                '/channelart/icca-report/channel.webp',
                '/channelart/mii/miis.png',
            ];

            const channelArtVideos = [
                '/channelart/github/github.webm',
                '/channelart/linkedin/Linkedin Icon.webm',
            ];

            // the tiles' channel.html pages ask for their art with the version on
            channelArtImages.forEach(src => { const i = new Image(); i.src = src.endsWith('.webp') ? artUrl(src) : src; });
            channelArtVideos.forEach(src => {
                const v = document.createElement('video');
                v.preload = 'auto'; v.muted = true; v.src = src; v.load();
            });

            channels.forEach(channel => {
                // Channel preview video
                const format = channel.videoformat || 'gif';
                const videoSrc = previewSrc(channel);
                if (['mp4', 'webm', 'ogg', 'mov'].includes(format)) {
                    const v = document.createElement('video');
                    v.preload = 'auto'; v.muted = true; v.src = videoSrc; v.load();
                } else {
                    const i = new Image(); i.src = videoSrc;
                }

                // Channel audio
                const a = new Audio();
                a.preload = 'auto';
                a.src = audioSrc(channel);
                a.load();

                // Channel HTML prefetch
                fetch(artUrl(`/${channel.channelart}${channel.id}/channel.html`)).catch(() => {});
            });
        };

        // ── Helpers ──────────────────────────────────────────────────
        const loadImage = (src) => new Promise((resolve) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = src;
        });

        const loadAudio = (src) => new Promise((resolve) => {
            const audio = new Audio();
            audio.oncanplaythrough = resolve;
            audio.onerror = resolve;
            audio.src = src;
            audio.load();
            setTimeout(resolve, 1500);
        });

        const loadFont = (family) =>
            document.fonts.load(`1em ${family}`).catch(() => {});

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
                    {/* Laid out like the Wii's health and safety screen */}
                    <div className="hs">
                        <h1 className="hs-title">
                            <svg className="hs-icon" viewBox="0 0 64 56" aria-hidden="true">
                                <path d="M32 3 L62 53 H2 Z" fill="#fff" strokeLinejoin="round" />
                                <rect x="29" y="18" width="6" height="19" rx="3" fill="#000" />
                                <circle cx="32" cy="45" r="3.6" fill="#000" />
                            </svg>
                            WARNING-HEALTH AND SAFETY
                        </h1>

                        <div className="hs-caps">
                            <p>Hi, I&apos;m Adi. I research, design, make games and write code.</p>
                            <p>This portfolio is a Wii menu, and every channel is something I made.</p>
                        </div>

                        <div className="hs-small">
                            <p>Click a channel to open it.</p>
                            <p className="intro-desktop-only">Right-click for the Home menu.</p>
                        </div>

                        {canClick ? (
                            <span className="hs-press">{isTouch ? 'Tap' : 'Click'} anywhere to start.</span>
                        ) : (
                            <span className="hs-press hs-loading">Loading...</span>
                        )}

                        <p className="hs-note">Best on a computer. Phones work too, just a bit squished.</p>
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
