import { useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

const ROLES = ['Researcher', 'Designer', 'Game dev', 'Engineer'];

// Highest trek so far and the one I'm working towards, in metres
const HIGHEST = 4650;
const GOAL = 8000;

// Small line icons for the cards, drawn on a 24x24 grid
const ICONS = {
    crane: <path d="M2 14l7-2 3-8 3 8 7-4-6 9H8z M12 4v12" />,
    flower: <path d="M12 12c-3-1-5-4-4-7 2 0 4 2 4 4 0-2 2-4 4-4 1 3-1 6-4 7z M12 12c-2 1-6 1-7-2 2-1 5-1 7 2z M12 12c2 1 6 1 7-2-2-1-5-1-7 2z M12 12v9" />,
    crab: <path d="M7 13a5 4 0 0 0 10 0 5 4 0 0 0-10 0z M7 12L4 9l1-4 M17 12l3-3-1-4 M4 5l3 2 M20 5l-3 2 M8 17l-2 3 M16 17l2 3 M10 11v.5 M14 11v.5" />,
    harmonica: <path d="M3 9h18v6H3z M6 9v6 M9 9v6 M12 9v6 M15 9v6 M18 9v6" />,
    scroll: <path d="M6 4h11a2 2 0 0 1 0 4H8v10a2 2 0 0 1-4 0V6a2 2 0 0 1 2-2z M8 8h8v10a2 2 0 0 1-2 2H6 M11 12h3 M11 15h3" />,
    bolt: <path d="M13 2L5 13h6l-2 9 8-12h-6z" />,
    dice: <path d="M4 4h16v16H4z M8.5 8.5h.01 M15.5 8.5h.01 M12 12h.01 M8.5 15.5h.01 M15.5 15.5h.01" />,
};

function Icon({ name }) {
    return (
        <svg className="mii-icon" viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>
    );
}

// The mountain is drawn so its summit is the goal; the flag sits on the
// slope at the height I've reached
function Altitude() {
    const ground = 100, top = 12, left = 40, peak = 236;
    const y = ground - (HIGHEST / GOAL) * (ground - top);
    const x = left + (peak - left) * ((ground - y) / (ground - top));
    return (
        <svg className="mii-alt-svg" viewBox="0 0 320 112" role="img"
            aria-label={`Highest trek ${HIGHEST.toLocaleString()} metres, goal ${GOAL.toLocaleString()} metres`}>
            <path className="mii-alt-far" d="M0 100 L70 54 L112 74 L170 36 L214 62 L270 40 L320 70 V112 H0z" />
            <path className="mii-alt-peak" d={`M${left - 40} ${ground} L${left} ${ground} L${peak} ${top} L320 ${ground}z`} />
            <path className="mii-alt-snow" d={`M${peak} ${top} L${peak - 22} ${top + 10} L${peak - 12} ${top + 8} L${peak - 4} ${top + 14} L${peak + 6} ${top + 7} L${peak + 18} ${top + 10}z`} />
            <path className="mii-alt-ground" d="M0 100 H320 V112 H0z" />
            <path className="mii-alt-trail" d={`M${left + 10} ${ground} L${x} ${y}`} />
            <path className="mii-alt-todo" d={`M${x} ${y} L${peak} ${top}`} />
            <g transform={`translate(${x} ${y})`}>
                <path className="mii-alt-pole" d="M0 0 V-20" />
                <path className="mii-alt-flag" d="M0 -20 L14 -15 L0 -10z" />
            </g>
            <circle className="mii-alt-goal" cx={peak} cy={top} r="4" />
            <text className="mii-alt-label" x={x - 8} y={y + 4} textAnchor="end">{HIGHEST.toLocaleString()} m</text>
            <text className="mii-alt-label mii-alt-label-goal" x={peak + 10} y={top + 4}>{GOAL.toLocaleString()} m</text>
        </svg>
    );
}

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
                    <div className="mii-paper-stage">
                        <img src="/assets/mii-avatar.png" alt="Adi's Mii" className="mii-paper-mii" />
                    </div>
                    <div className="mii-paper-greeting">
                        <p className="mii-paper-hi">Hi, I'm</p>
                        <h1 className="mii-paper-name">Adi</h1>
                        <ul className="mii-paper-roles">
                            {ROLES.map(role => <li key={role}>{role}</li>)}
                        </ul>
                    </div>
                </div>

                <div className="mii-paper-content">
                    <p className="mii-paper-motto">Jack of all trades, master of none.</p>

                    <section className="mii-card mii-card-alt">
                        <h2>Trekking</h2>
                        <Altitude />
                        <p>Highest so far is 4,650 m. One day I want to stand on an 8,000 m peak.</p>
                    </section>

                    <div className="mii-paper-pair">
                        <section className="mii-card">
                            <h2>I fold things</h2>
                            <ul className="mii-list">
                                <li><Icon name="crane" /><span><b>Origami</b></span></li>
                                <li><Icon name="flower" /><span><b>Hanakami</b>, origami with flower petals</span></li>
                            </ul>
                        </section>

                        <section className="mii-card">
                            <h2>Learning</h2>
                            <ul className="mii-list">
                                <li><Icon name="crab" /><span><b>Rust</b></span></li>
                                <li><Icon name="harmonica" /><span><b>Harmonica</b>, slowly</span></li>
                            </ul>
                        </section>
                    </div>

                    <section className="mii-card">
                        <h2>Also into</h2>
                        <ul className="mii-tags">
                            <li><Icon name="scroll" />History</li>
                            <li><Icon name="bolt" />Harry Potter</li>
                            <li><Icon name="dice" />Roguelikes</li>
                        </ul>
                    </section>
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
