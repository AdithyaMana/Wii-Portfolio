import { useState } from 'react';
import { useDateTime } from '../hooks/useDateTime';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

export function MessageBoard({ onClose }) {
    const [isOpened, setIsOpened] = useState(false);
    const { dateDiary } = useDateTime();
    const { playSFX } = useAudio();
    const { config } = useConfig();

    const handleCardClick = () => {
        playSFX('letter-in.mp3', config.sfxVol);
        setIsOpened(true);
    };

    const handleBack = () => {
        playSFX('button-hover.mp3', config.sfxVol);
        setIsOpened(false);
    };

    const handleClose = () => {
        playSFX('button-select-big.mp3', config.sfxVol);
        onClose?.();
    };

    const handleHover = () => {
        playSFX('button-hover.mp3', config.sfxVol);
    };

    return (
        <div className="msgboard" style={{ display: 'flex' }}>
            <div className="bg" style={{ display: isOpened ? 'block' : 'none' }}></div>

            <div className="card buttonlike" onClick={handleCardClick}>
                <img src="/assets/mii-avatar.png" className="mii" alt="Mii" />
                <br />
                <span>From: Adi</span>
            </div>

            <div className="opened" style={{ display: isOpened ? 'flex' : 'none' }}>
                <div className="memo">
                    <span className="title">Memo</span>
                    <img src="/assets/mii-avatar.png" className="mii" title="Adi" alt="Mii" />
                    <div className="lines">
                        <span>Here are my professional links:</span>
                        <span><a href="https://www.linkedin.com/in/akiraux/" target="_blank" rel="noopener noreferrer">LinkedIn</a></span>
                        <span><a href="https://github.com/AdithyaMana" target="_blank" rel="noopener noreferrer">Github</a></span>
                        <span><a href="https://akira1ze.hashnode.dev/" target="_blank" rel="noopener noreferrer">Blog</a></span>
                        <span><a href="https://drive.google.com/file/d/1ZuYEF79wt3AbnAVJjn5Onfw5NYhgaPO4/view?usp=sharing" target="_blank" rel="noopener noreferrer">Resume</a></span>
                    </div>
                </div>
                <a className="alt-btn back" onMouseOver={handleHover} onClick={handleBack}>
                    Back
                </a>
            </div>

            <div className="bottom">
                <span id="date2">{dateDiary}</span>
                <div className="lateral">
                    <img src="/assets/right-button.png" className="right-btn" alt="" />
                    <img
                        src="/assets/backtomenu.png"
                        className="back-btn backtowiimenu buttonlike"
                        onClick={handleClose}
                        alt="Back to Menu"
                    />
                    <span className="tag">Wii Menu</span>
                </div>
            </div>
        </div>
    );
}
