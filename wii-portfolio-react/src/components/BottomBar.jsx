import { useDateTime } from '../hooks/useDateTime';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

export function BottomBar({ onWiiClick, onMailClick, onHomeClick }) {
    const { time, date } = useDateTime();
    const { playSFX } = useAudio();
    const { config } = useConfig();

    const handleWiiClick = () => {
        playSFX('button-select-big.mp3', config.sfxVol);
        onWiiClick?.();
    };

    const handleMailClick = () => {
        playSFX('button-select-big.mp3', config.sfxVol);
        onMailClick?.();
    };

    const handleHomeClick = () => {
        playSFX('home-in.mp3', config.sfxVol);
        onHomeClick?.();
    };

    return (
        <div className="bottom-bar">
            <div className="lateral left">
                <img src="/assets/nav-arrow-left.png" className="left-btn" alt="" />
                <img
                    src="/assets/wii-circle-button.png"
                    className="wii-btn buttonlike"
                    onClick={handleWiiClick}
                    alt="Wii Settings"
                />
                <span className="tag">Wii Settings</span>
            </div>

            <div className="info">
                <span className="jg">Adi's Portfolio</span>
                <span id="hour">{time}</span>
                <span id="date">{date}</span>
                {/* Mobile home button - visible only on touch devices */}
                <button
                    className="mobile-home-btn"
                    onClick={handleHomeClick}
                    aria-label="Home Menu"
                >
                    HOME
                </button>
            </div>

            <div className="lateral right">
                <img src="/assets/nav-arrow-right.png" className="right-btn" alt="" />
                <img
                    src="/assets/mail-circle-button.png"
                    className="diary-btn buttonlike"
                    onClick={handleMailClick}
                    alt="Message Board"
                />
                <span className="tag">Wii Message Board</span>
            </div>
        </div>
    );
}

