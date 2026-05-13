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
                        <p>I come from UX but I keep ending up owning the whole stack. Figma, React/TypeScript, Unity, Unreal, A-Frame. Lately a lot of LLM tooling and agent work, less hobby, more just how I ship things now.</p>
                    </div>

                    <div className="mii-paper-section">
                        <h2 className="mii-paper-section-title">outside the screen</h2>
                        <p>Hiker, origamist, sketcher, motorcyclist, gamer. Any given weekend I'm folding paper, on a trail, drawing in a sketchbook, on two wheels, or three hours into a game I should have finished a month ago.</p>
                        <p>Also a theology and history nerd. Byzantine church politics, ancient historiography — that stuff genuinely gets me going. I like knowing why things went the way they did. Applies to civilisations, codebases, design systems.</p>
                        <p>How things feel matters a lot to me. A good interface and a good trail are more similar than you'd expect.</p>
                    </div>

                    <div className="mii-paper-section">
                        <h2 className="mii-paper-section-title">a few more things</h2>
                        <ul className="mii-paper-list">
                            <li>Tufte changed how I think about showing information</li>
                            <li>I sketch before I prototype. Always.</li>
                            <li>Motorcycling taught me more about feedback loops than any course</li>
                            <li>Currently trying to fold a Satoshi Kamiya dragon. It's going.</li>
                            <li>I will always stop on a trail to look at the view</li>
                            <li>I have opinions about which games have the best world-building</li>
                        </ul>
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
