import { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

// For a report that can't be shown publicly: instead of opening it, the
// channel asks visitors to email for the PDF, in the Wii's own message box
export function ReportRequest({ channel, onClose }) {
    const { playSFX } = useAudio();
    const { config } = useConfig();
    const [copied, setCopied] = useState(false);

    const email = channel.contact;
    const subject = `${channel.title} request`;
    const body = `Hi Adithya,\n\nCould you send me the PDF of the ${channel.title}?\n\nThanks!`;
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const handleHover = () => {
        playSFX('button-hover.mp3', config.sfxVol);
    };

    const handleEmail = () => {
        playSFX('button-select.mp3', config.sfxVol);
    };

    // for visitors without a mail app: one click copies the address
    const handleCopy = () => {
        navigator.clipboard?.writeText(email).then(() => setCopied(true)).catch(() => { });
    };

    const handleBack = () => {
        playSFX('button-cancel.mp3', config.sfxVol);
        onClose?.();
    };

    return (
        <div className="returndialog report-request" style={{ display: 'flex' }}>
            <div className="msgbox">
                <div className="text">
                    The {channel.title} isn&apos;t public yet.<br />
                    Email me and I&apos;ll send you the PDF:<br />
                    <span className="contact-email" onClick={handleCopy}>{email}</span>
                    <span className="contact-hint">{copied ? 'Copied!' : '(click the address to copy it)'}</span>
                </div>
                <div className="actions">
                    <a href={mailto} onClick={handleEmail} onMouseOver={handleHover}>Email me</a>
                    <a className="closedialog" onClick={handleBack} onMouseOver={handleHover}>Back</a>
                </div>
            </div>
        </div>
    );
}
