import { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

/**
 * In-site "mini tab": a Wii-styled floating window that loads a channel's
 * target inside an iframe. On mobile it covers the whole screen instead
 * of floating. Only used for channels that declare an `embed` URL —
 * sites that forbid framing (GitHub, LinkedIn, Medium…) still open in a
 * real browser tab.
 */
export function WiiTab({ channel, onClose }) {
    const { playSFX } = useAudio();
    const { config } = useConfig();
    const [loaded, setLoaded] = useState(false);

    // Close on Escape for keyboard users
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // While the tab is open, switch back to the normal OS cursor —
    // the Wii cursor can't follow the mouse inside the iframe, which
    // would otherwise leave two cursors on screen
    useEffect(() => {
        document.body.classList.add('wii-tab-open');
        return () => document.body.classList.remove('wii-tab-open');
    }, []);

    const handleClose = () => {
        playSFX('button-cancel.mp3', config.sfxVol);
        onClose?.();
    };

    const handleExternal = () => {
        playSFX('button-select.mp3', config.sfxVol);
        window.open(channel.target || channel.embed, '_blank', 'noopener');
    };

    return (
        <div className="wii-tab-overlay">
            <div className="wii-tab-window">
                <div className="wii-tab-bar">
                    <img src="/assets/wii-logo.svg" className="wii-tab-logo" alt="" />
                    <span className="wii-tab-title">{channel.title}</span>
                    <div className="wii-tab-actions">
                        <button
                            className="wii-tab-btn"
                            onClick={handleExternal}
                            aria-label="Open in new window"
                            title="Open in new window"
                        >
                            ⧉
                        </button>
                        <button
                            className="wii-tab-btn wii-tab-close"
                            onClick={handleClose}
                            aria-label="Close"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="wii-tab-body">
                    {!loaded && (
                        <div className="wii-tab-loading">
                            <img src="/assets/loading.png" className="loading" alt="" />
                            <span>Loading channel…</span>
                        </div>
                    )}
                    <iframe
                        className="wii-tab-frame"
                        src={channel.embed}
                        title={channel.title}
                        allow="autoplay; fullscreen; encrypted-media"
                        allowFullScreen
                        onLoad={() => setLoaded(true)}
                        style={{ opacity: loaded ? 1 : 0 }}
                    />
                </div>
            </div>
        </div>
    );
}
