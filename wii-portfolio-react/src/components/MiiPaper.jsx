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
                        <p>Started in UX but I kept picking up pieces until I was running the whole stack—Figma, React/TypeScript, Unity, Unreal, A-Frame. These days most of my time goes to LLM tooling and agent work. It's just work now.</p>
                    </div>

                    <div className="mii-paper-section">
                        <h2 className="mii-paper-section-title">outside the screen</h2>
                        <p>I hike, fold origami, sketch, ride motorcycles, and play games for way too long. I'm also properly into history and theology—Byzantine church politics, ancient historiography, that stuff genuinely gets me going. I like knowing <em>why</em> things happened the way they did. That applies everywhere: civilizations, codebases, design systems.</p>
                        <p>I care about how things feel, maybe too much. A good interface and a good trail actually have a lot in common.</p>
                    </div>

                    <div className="mii-paper-section">
                        <h2 className="mii-paper-section-title">a few more things</h2>
                        <p>Tufte changed how I think about showing information. I always sketch before prototyping. Motorcycling taught me more about feedback loops than any course. Currently working through a Satoshi Kamiya dragon (slow). I'll always stop on a trail to look. I have opinions about world-building in games.</p>
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
