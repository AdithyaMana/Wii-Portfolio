import { useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

// Mii-profile style facts, label then value
const FACTS = [
    ['right now', "Folding a Satoshi Kamiya dragon. It's winning."],
    ['off the clock', 'Out on a trail, or on my motorcycle.'],
    ['rabbit hole', 'Byzantine church politics.'],
    ['ask me about', 'World-building in games. I have opinions.'],
];

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
                    <div className="mii-paper-intro">
                        <p>I started in UX and kept picking up tools. These days it's mostly LLM tools and agents, but everything still starts as a sketch on paper.</p>
                        <p className="mii-paper-hook">I care a lot about how things feel. Probably too much.</p>
                    </div>

                    <dl className="mii-paper-facts">
                        {FACTS.map(([label, value]) => (
                            <div key={label}>
                                <dt>{label}</dt>
                                <dd>{value}</dd>
                            </div>
                        ))}
                    </dl>
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
