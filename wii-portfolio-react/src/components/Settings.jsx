import { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

export function Settings({ onClose }) {
    const { playSFX } = useAudio();
    const { config } = useConfig();
    const [view, setView] = useState('menu'); // 'menu' or 'system'
    const [page, setPage] = useState(1);
    const [onlineVer, setOnlineVer] = useState('');
    const localVer = "1.2";

    useEffect(() => {
        if (view === 'system') {
            // Simulate check for updates
            setTimeout(() => {
                setOnlineVer("1.2");
            }, 500);
        }
    }, [view]);

    const handleClose = () => {
        playSFX('button-hover.mp3', config.sfxVol);
        onClose?.();
    };

    const handleHover = () => {
        playSFX('button-hover.mp3', config.sfxVol);
    };

    const handleSystemSettingsClick = (e) => {
        e.preventDefault();
        playSFX('button-select-big.mp3', config.sfxVol);
        setView('system');
    };

    const handleBackToMenu = () => {
        playSFX('button-hover.mp3', config.sfxVol);
        setView('menu');
    };

    const handlePrev = () => {
        playSFX('nextprev.mp3', config.sfxVol);
        setPage(Math.max(1, page - 1));
    };

    const handleNext = () => {
        playSFX('nextprev.mp3', config.sfxVol);
        setPage(Math.min(2, page + 1));
    };

    const renderMenu = () => (
        <div className="settings-content" style={{ display: 'block' }}>
            <div className="topbar">
                <img src="/assets/wii-logo.svg" alt="Wii Logo" />
            </div>

            <div className="cells">
                <a
                    className="info buttonlike"
                    href="https://github.com/AdithyaMana/Wii-Portfolio"
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseOver={handleHover}
                />
                <a
                    className="stngs buttonlike"
                    href="#"
                    onClick={handleSystemSettingsClick}
                    onMouseOver={handleHover}
                />
            </div>

            <div className="bottombar">
                <a className="alt-btn close" onMouseOver={handleHover} onClick={handleClose}>
                    Back
                </a>
            </div>
        </div>
    );

    const renderSystemSettings = () => (
        <div className="settings-system">
            <div className="topbar">
                <div className="header">
                    Wii System Settings <span className="gray">(WIP)</span>
                </div>
                <div className="version">Ver {localVer}</div>
            </div>

            <div className="page-container">
                {page > 1 && (
                    <div className="page-arrow prev" onClick={handlePrev}>
                        <img src="/assets/prev-default.png" className="def" alt="Prev" />
                        <img src="/assets/prev-hover.png" className="hover" alt="Prev" />
                    </div>
                )}

                {page === 1 && (
                    <div className="setting-page">
                        <div className="content">
                            if you see this, you have an error<br />(Just kidding, use the arrow)
                        </div>
                    </div>
                )}

                {page === 2 && (
                    <div className="setting-page">
                        <div className="content">
                            Website version&nbsp;<span id="versionprint">{localVer}</span><br />
                            Online latest available: <span id="updatedver">{onlineVer || 'Checking...'}</span><br />
                            Based upon Wii System 4.3E
                        </div>
                    </div>
                )}

                {page < 2 && (
                    <div className="page-arrow next" onClick={handleNext}>
                        <img src="/assets/next-hover.png" className="hover" alt="Next" />
                        <img src="/assets/next-default.png" className="def" alt="Next" />
                    </div>
                )}
            </div>

            <div className="bottombar">
                <a className="alt-btn" onMouseOver={handleHover} onClick={handleClose}>Quit</a>
                <a className="alt-btn" onMouseOver={handleHover} onClick={handleBackToMenu}>Back</a>
                <a className="alt-btn" href="https://github.com/AdithyaMana/Wii-Portfolio" target="_blank" rel="noreferrer" onMouseOver={handleHover}>GitHub</a>
            </div>
        </div>
    );

    return (
        <div className="settings" style={{ display: 'block' }}>
            {view === 'menu' ? renderMenu() : renderSystemSettings()}
        </div>
    );
}
