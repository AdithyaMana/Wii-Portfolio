import { memo } from 'react';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

export const Channel = memo(function Channel({ channel, isBlank, onClick, onHover, className = '' }) {
    const { playSFX } = useAudio();
    const { config } = useConfig();

    const handleHover = () => {
        playSFX('button-hover.mp3', config.sfxVol);
        onHover?.(channel);
    };

    if (isBlank) {
        return <div className={`ch blank ${className}`.trim()}></div>;
    }

    return (
        <div
            className={`ch occupied ${className}`.trim()}
            data-id={channel.id}
            data-href={channel.target}
            onClick={() => onClick?.(channel)}
            style={{ willChange: 'transform' }}
        >
            {channel.disc && (
                <img src="/channelart/disc/disc.png" className="spinnin" alt="Disc" loading="lazy" />
            )}
            <iframe
                src={`/${channel.channelart}${channel.id}/channel.html`}
                title={channel.title}
                style={{ border: 'none', pointerEvents: 'none' }}
                allow="autoplay; encrypted-media"
            />
            <div
                className="onhover"
                onMouseOver={handleHover}
            />
            <span className="tag" id={channel.disc ? 'discTag' : undefined}>
                {channel.title}
            </span>
        </div>
    );
});

