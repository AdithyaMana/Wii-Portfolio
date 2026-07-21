import { useState, useRef, useEffect, useMemo } from 'react';
import { Channel } from './Channel';
import { BottomBar } from './BottomBar';
import { useChannels } from '../context/ChannelsContext';
import { useAudio } from '../context/AudioContext';
import { useConfig } from '../context/ConfigContext';

export function MainMenu({
    onChannelSelect,
    onSettingsClick,
    onMessageBoardClick,
    onHomeClick,
    isChannelOpen,
    isReturning
}) {
    const { channels } = useChannels();
    const { playSFX } = useAudio();
    const { config } = useConfig();
    const gridRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

    useEffect(() => {
        let timeoutId;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setIsMobile(window.innerWidth <= 768);
            }, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // 8 slots for mobile, 12 for desktop
    const slotsPerPage = isMobile ? 8 : 12;

    // Calculate total pages needed, but keep at least 2 for that Wii feel
    const totalPages = Math.max(2, Math.ceil(channels.length / slotsPerPage));

    const showPrev = currentPage > 1;
    const showNext = currentPage < totalPages;

    // Create slots for each page
    const pages = useMemo(() => {
        const pagesList = [];
        let channelIndex = 0;

        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
            const pageSlots = [];

            for (let slotNum = 0; slotNum < slotsPerPage; slotNum++) {
                if (channelIndex < channels.length) {
                    pageSlots.push({
                        channel: channels[channelIndex],
                        isBlank: false,
                        slotIndex: slotNum
                    });
                    channelIndex++;
                } else {
                    pageSlots.push({
                        channel: null,
                        isBlank: true,
                        slotIndex: slotNum
                    });
                }
            }
            pagesList.push(pageSlots);
        }
        return pagesList;
    }, [channels, slotsPerPage, totalPages]);

    const handlePrev = () => {
        playSFX('nextprev.mp3', config.sfxVol);
        if (gridRef.current) {
            const pageEl = gridRef.current.querySelector('.ch-c');
            const pageWidth = pageEl ? pageEl.offsetWidth : gridRef.current.clientWidth;
            gridRef.current.scrollLeft -= pageWidth;
        }
        setCurrentPage(prev => Math.max(1, prev - 1));
    };

    const handleNext = () => {
        playSFX('nextprev.mp3', config.sfxVol);
        if (gridRef.current) {
            const pageEl = gridRef.current.querySelector('.ch-c');
            const pageWidth = pageEl ? pageEl.offsetWidth : gridRef.current.clientWidth;
            gridRef.current.scrollLeft += pageWidth;
        }
        setCurrentPage(prev => Math.min(totalPages, prev + 1));
    };

    const handleChannelClick = (channel) => {
        if (!channel) return;

        // Same flow on every device: open the channel preview screen
        onChannelSelect?.(channel);
    };

    // Preload channel assets on hover
    const preloadedRef = useRef(new Set());

    const handleChannelHover = (channel) => {
        if (!channel || preloadedRef.current.has(channel.id)) return;

        preloadedRef.current.add(channel.id);
        const format = channel.videoformat || 'gif';
        // Construct path matching ChannelSelection logic
        const src = `/${channel.assets}${channel.id}/video.${format}`;

        if (['mp4', 'webm', 'ogg', 'mov'].includes(format)) {
            const vid = document.createElement('video');
            vid.src = src;
            vid.preload = 'auto';
        } else {
            const img = new Image();
            img.src = src;
        }
    };

    // Determine CSS classes
    let menuClass = 'main-menu';
    if (isChannelOpen) {
        menuClass += ' ch-trans-on';
    }
    if (isReturning) {
        menuClass += ' chsout-anim';
    }

    return (
        <div className={menuClass}>
            <div className="grid" ref={gridRef}>
                <div className="prev" style={{ display: showPrev ? 'flex' : 'none' }} onClick={handlePrev}>
                    <img src="/assets/prev-default.png" className="def" alt="" />
                    <img src="/assets/prev-hover.png" className="hover" alt="" />
                </div>

                {pages.map((pageSlots, pageIndex) => (
                    <div className="ch-c" key={pageIndex}>
                        {pageSlots.map((slot, index) => (
                            <Channel
                                key={slot.channel?.id || `blank-${pageIndex}-${index}`}
                                channel={slot.channel}
                                isBlank={slot.isBlank}
                                onClick={handleChannelClick}
                                onHover={handleChannelHover}
                            />
                        ))}
                    </div>
                ))}

                <div className="next" style={{ display: showNext ? 'flex' : 'none' }} onClick={handleNext}>
                    <img src="/assets/next-hover.png" className="hover" alt="" />
                    <img src="/assets/next-default.png" className="def" alt="" />
                </div>
            </div>

            <BottomBar
                onWiiClick={onSettingsClick}
                onMailClick={onMessageBoardClick}
                onHomeClick={onHomeClick}
            />
        </div>
    );
}



