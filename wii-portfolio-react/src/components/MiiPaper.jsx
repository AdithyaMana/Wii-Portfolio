import { useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

export function MiiPaper({ onClose }) {
    const { playSFX } = useAudio();
    const { config } = useConfig();

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleClose = () => {
        playSFX('button-select.mp3', config.sfxVol);
        onClose?.();
    };

    return (
        <div className="mii-paper-overlay" onClick={handleClose}>
            <div className="mii-paper" onClick={e => e.stopPropagation()}>

                <div className="mii-paper-header">
                    <img src="/assets/mii-avatar.png" alt="Adi's Mii" className="mii-paper-mii" />
                    <div className="mii-paper-greeting">
                        <h1 className="mii-paper-name">hey, i'm adi!</h1>
                        <p className="mii-paper-tagline">designer, engineer and researcher</p>
                    </div>
                </div>

                <div className="mii-paper-content">
                    <div className="mii-paper-section">
                        <h2 className="mii-paper-section-title">what i do</h2>
                        <p>Started in UX, kept picking up tools. Figma, React, TypeScript, Unity, Unreal, A-Frame. Mostly LLM tooling and agents now.</p>
                    </div>

                    <div className="mii-paper-section">
                        <h2 className="mii-paper-section-title">outside the screen</h2>
                        <p>I hike, fold origami, sketch, ride motorcycles, and play games for too long. I'm weirdly into Byzantine church politics and ancient historiography. I just want to know why things turned out the way they did.</p>
                        <p>I probably care too much about how things feel.</p>
                    </div>

                    <div className="mii-paper-section">
                        <h2 className="mii-paper-section-title">a few more things</h2>
                        <p>I always sketch before I prototype. Right now I'm folding a Satoshi Kamiya dragon and it's taking forever. On trails I stop to look at things even when nobody else wants to. I have strong opinions about world-building in games.</p>
                    </div>
                </div>

                <div className="mii-paper-footer">
                    <button className="mii-paper-close-btn" onClick={handleClose}>
                        <img src="/assets/back.png" alt="Back" />
                    </button>
                </div>
            </div>
        </div>
    );
}
