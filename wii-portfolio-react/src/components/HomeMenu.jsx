import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

export function HomeMenu({ onClose, onWiiMenu }) {
    const { playSFX } = useAudio();
    const { config } = useConfig();

    const handleClose = () => {
        playSFX('button-cancel.mp3', config.sfxVol);
        onClose?.();
    };

    const handleWiiMenu = () => {
        playSFX('button-select-big.mp3', config.sfxVol);
        onWiiMenu?.();
    };

    const handleHover = () => {
        playSFX('button-hover.mp3', config.sfxVol);
    };

    return (
        <div className="home-menu" style={{ display: 'grid' }}>
            <div className="bar-top close-pause-menu" onClick={handleClose}>
                <span>HOME Menu</span>
                <img src="/assets/home-close.png" alt="Close" />
            </div>

            <div className="in-between">
                <a
                    className="buttonlike backtomenu"
                    onMouseOver={handleHover}
                    onClick={handleWiiMenu}
                >
                    Wii Menu
                </a>
            </div>

            <div className="bar-bottom">
                <img src="/assets/remote.png" className="remote" alt="Remote" />
                <div>
                    <div className="battery">
                        <div>
                            <span>P1</span>
                            <img src="/assets/power-full.png" alt="Full" />
                        </div>
                        <div>
                            <span>P2</span>
                            <img src="/assets/power-empty.png" alt="Empty" />
                        </div>
                        <div>
                            <span>P3</span>
                            <img src="/assets/power-empty.png" alt="Empty" />
                        </div>
                        <div>
                            <span>P4</span>
                            <img src="/assets/power-empty.png" alt="Empty" />
                        </div>
                    </div>
                    <div className="text">Wii Remote Settings</div>
                </div>
            </div>
        </div>
    );
}
