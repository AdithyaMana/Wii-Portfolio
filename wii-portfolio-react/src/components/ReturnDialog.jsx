import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

export function ReturnDialog({ onYes, onNo }) {
    const { playSFX } = useAudio();
    const { config } = useConfig();

    const handleYes = () => {
        playSFX('returntomenu.mp3', config.sfxVol);
        setTimeout(() => {
            document.body.classList.add('fadeOut');
        }, 1000);
        setTimeout(() => {
            window.location.href = '/?skipwarn=true';
        }, 1500);
    };

    const handleNo = () => {
        playSFX('button-cancel.mp3', config.sfxVol);
        onNo?.();
    };

    const handleHover = () => {
        playSFX('button-hover.mp3', config.sfxVol);
    };

    return (
        <div className="returndialog" style={{ display: 'flex' }}>
            <div className="msgbox">
                <div className="text">
                    Return to the Wii Menu?<br />
                    (Anything not saved will be lost.)
                </div>
                <div className="actions">
                    <a onClick={handleYes} onMouseOver={handleHover}>Yes</a>
                    <a className="closedialog" onMouseOver={handleHover} onClick={handleNo}>No</a>
                </div>
            </div>
        </div>
    );
}
