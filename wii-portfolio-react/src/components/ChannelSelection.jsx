import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

const MiiPaper = lazy(() => import('./MiiPaper').then(m => ({ default: m.MiiPaper })));
const WiiTab = lazy(() => import('./WiiTab').then(m => ({ default: m.WiiTab })));

export function ChannelSelection({ channel, onBack, onNext, onPrev, isReturning }) {
    const { playSFX, playSFXMulti, bgMusicToggle } = useAudio();
    const { config } = useConfig();
    const audioRef = useRef(null);
    const fadeIntervalRef = useRef(null);
    const canStartChannel = (ch) => !!ch?.target || ch?.action === 'open-paper';
    const [canStart, setCanStart] = useState(() => canStartChannel(channel));
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [showMiiPaper, setShowMiiPaper] = useState(false);
    const [showWiiTab, setShowWiiTab] = useState(false);

    useEffect(() => {
        // Reset states when channel changes
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsVideoLoaded(false);
    }, [channel]);

    useEffect(() => {
        // Pause main background music when entering channel selection
        bgMusicToggle(false);

        if (channel && audioRef.current) {
            const audioFormat = channel.audioformat || 'mp3';
            const audioSrc = `/${channel.assets}${channel.id}/audio.${audioFormat}`;
            audioRef.current.src = audioSrc;
            audioRef.current.currentTime = 0;
            // Ensure each channel preview starts at configured volume
            audioRef.current.volume = config.musicVol ?? 0.5;
            audioRef.current.play().catch(() => { });
        }

        // Update canStart when channel changes
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCanStart(canStartChannel(channel));
        setShowMiiPaper(false);
        setShowWiiTab(false);

        const fadeInterval = fadeIntervalRef.current;
        const audio = audioRef.current;
        return () => {
            if (fadeInterval) {
                clearInterval(fadeInterval);
            }
            if (audio) {
                audio.pause();
            }
        };
    }, [channel, bgMusicToggle, config.musicVol]);

    const [videoFormat, setVideoFormat] = useState(channel?.videoformat || 'gif');

    useEffect(() => {
        // Reset format when channel changes
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVideoFormat(channel?.videoformat || 'gif');
    }, [channel]);

    // Handle visibility change for local audio
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && audioRef.current) {
                audioRef.current.pause();
            } else if (audioRef.current && channel) {
                audioRef.current.play().catch(() => { });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [channel]);

    const getVideoSrc = () => {
        if (!channel) return '';
        // If it's a real video format, return it directly
        if (['mp4', 'webm', 'ogg', 'mov'].includes(channel.videoformat)) {
            return `/${channel.assets}${channel.id}/video.${channel.videoformat}`;
        }

        return `/${channel.assets}${channel.id}/video.${videoFormat}`;
    };

    const handleVideoError = () => {
        // Fall back through image formats if the declared one is missing
        if (videoFormat === 'gif') {
            setVideoFormat('jpg');
        } else if (videoFormat === 'jpg') {
            setVideoFormat('png');
        }
    };

    const handleBack = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        playSFXMulti(config.sfxVol, ['button-select.mp3', 'channel-back.mp3']);
        onBack?.();
    };

    const handleStart = () => {
        if (!canStartChannel(channel)) return;

        playSFX('button-select-big.mp3', config.sfxVol);

        if (channel.action === 'open-paper') {
            setShowMiiPaper(true);
            return;
        }

        // Channels with an embed URL open inside the site in a Wii tab
        if (channel.embed) {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            setShowWiiTab(true);
            return;
        }

        // Sites that forbid framing open in a real browser tab
        window.open(channel.target, '_blank');

        // Reset audio volume if it was fading
        if (audioRef.current) {
            audioRef.current.volume = config.musicVol ?? 0.5;
        }
    };

    const handleWiiTabClose = () => {
        setShowWiiTab(false);
        // Resume the channel's preview audio
        if (audioRef.current) {
            audioRef.current.play().catch(() => { });
        }
    };

    const handleHover = () => {
        playSFX('button-hover.mp3', config.sfxVol);
    };

    const handlePrevClick = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        onPrev?.();
    };

    const handleNextClick = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        onNext?.();
    };

    if (!channel) return null;

    return (
        <div className={`ch-selection ${isReturning ? 'ch-selection-exit' : ''}`} data-channel-id={channel.id} style={{ display: 'flex', opacity: 1 }}>
            {/* Navigation arrows */}
            <div
                className="ch-nav-arrow ch-nav-left"
                onClick={handlePrevClick}
                onMouseOver={handleHover}
            >
                <img src="/assets/arrow-left-blue-new.png" alt="Previous" />
            </div>
            <div
                className="ch-nav-arrow ch-nav-right"
                onClick={handleNextClick}
                onMouseOver={handleHover}
            >
                <img src="/assets/arrow-right-blue-new.png" alt="Next" />
            </div>

            {/* Main content area */}
            <div className="thecontent">
                <div className="tl"></div>
                <div className="tr"></div>
                <div className="bl"></div>
                <div className="br"></div>

                {/* Loading Placeholder */}
                {!isVideoLoaded && (
                    <div className="ch-loading-placeholder" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 5,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'black' // Or match the background pattern color
                    }}>
                        <img
                            src="/assets/loading.png"
                            alt="Loading..."
                            className="loading"
                            style={{ width: '10vh', height: '10vh' }}
                        />
                    </div>
                )}

                {/* Channel video/logo */}
                <div
                    className="ch-logo-container"
                    key={channel.id}
                    data-channel-id={channel.id}
                    style={{
                        opacity: isVideoLoaded ? 1 : 0,
                        transition: 'opacity 0.4s ease-out'
                    }}
                >
                    {['mp4', 'webm', 'ogg', 'mov'].includes(channel.videoformat) ? (
                        <video
                            id="videoSpec"
                            className="ch-logo"
                            src={getVideoSrc()}
                            autoPlay
                            muted
                            playsInline
                            loop={channel.id === 'github'}
                            onLoadedData={() => setIsVideoLoaded(true)}
                        />
                    ) : (
                        <img
                            id="videoSpec"
                            className="ch-logo"
                            src={getVideoSrc()}
                            alt=""
                            onLoad={() => setIsVideoLoaded(true)}
                            onError={handleVideoError}
                        />
                    )}
                    {/* Reflection removed for performance */}
                </div>

                {/* Case Study Under Progress notification */}
                {(channel.id === 'tuftes-razor') && (
                    <div className="ch-progress-notification">
                        <span>🚧 Case study under progress — check out the website and go full screen!</span>
                    </div>
                )}
            </div>

            {/* Bottom bar with buttons */}
            <div className="ch-bottom-bar">
                <div className="buttons">
                    <button
                        className="wii-btn wii-menu-btn"
                        onMouseOver={handleHover}
                        onClick={handleBack}
                    >
                        <img src="/assets/wii-menu-button.png" alt="Wii Menu" />
                    </button>
                    <button
                        className={`wii-btn start-btn ${canStart ? '' : 'disabled-btn'}`}
                        onMouseOver={handleHover}
                        onClick={handleStart}
                    >
                        <img src="/assets/start-button.png" alt="Start" />
                    </button>
                </div>
            </div>

            <audio ref={audioRef} id="chSpec" />

            {/* Mii About-Me Paper */}
            <Suspense fallback={null}>
                {showMiiPaper && (
                    <MiiPaper onClose={() => setShowMiiPaper(false)} />
                )}

                {/* In-site Wii tab viewer */}
                {showWiiTab && (
                    <WiiTab channel={channel} onClose={handleWiiTabClose} />
                )}
            </Suspense>

        </div>
    );
}
