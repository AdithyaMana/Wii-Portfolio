import { createContext, useContext, useState, useEffect } from 'react';

const ChannelsContext = createContext(null);

const DEFAULT_CHANNELS = [
    {
        id: 'disc',
        title: 'Disc Channel',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: '',
        videoformat: "mp4",
        audioformat: "mp4"
    },
    {
        id: 'mii',
        title: 'Mii Channel',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: '',
        action: 'open-paper'
    },
    {
        id: 'research-agent',
        title: 'Research Agent',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'https://www.figma.com/deck/rDEzRouqrAVKzxeQXkJtZo/Case-Study-1?node-id=1-9&viewport=-159%2C-34%2C0.73&t=XHJPjZQl2nXOeLnm-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1'
    },
    {
        id: 'credit-survey',
        title: 'Credit Survey',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'https://www.figma.com/deck/vldYentYW7Fovy9SfKACVn/Case-Study-2?node-id=5-9&t=bAE08gPrxq7fiShM-1'
    },
    {
        id: 'credit-website',
        title: 'Credit Website',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'https://medium.com/@akirauxr/cat-videos-a-panicked-discord-message-and-14-icons-a4cc5a2c4e6c'
    },
    {
        id: 'tuftes-razor',
        title: "Tufte's Razor",
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'https://tuftesrazor.scienceux.org/'
    },
    {
        id: 'github',
        title: 'Github',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'https://github.com/AdithyaMana',
        videoformat: 'mp4'
    },
    {
        id: 'linkedin',
        title: 'LinkedIn',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'https://www.linkedin.com/in/akiraux/',
        videoformat: 'mp4'
    },
    {
        id: 'resume',
        title: 'Resume',
        assets: 'assets/channels/',
        channelart: 'channelart/',
        target: 'https://drive.google.com/file/d/1ZuYEF79wt3AbnAVJjn5Onfw5NYhgaPO4/view?usp=sharing'
    },
];

export function ChannelsProvider({ children }) {
    const [channels, setChannels] = useState(() => {
        try {
            const stored = localStorage.getItem('adifolio-channels-v17');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load channels from localStorage:', e);
        }
        return DEFAULT_CHANNELS;
    });

    // Save channels to localStorage when they change
    useEffect(() => {
        try {
            localStorage.setItem('adifolio-channels-v17', JSON.stringify(channels));
        } catch (e) {
            console.error('Failed to save channels to localStorage:', e);
        }
    }, [channels]);

    const addChannel = (id, title, assets, channelart, target, videoformat) => {
        // Validation
        if (!id) return { err: true, msg: 'You must supply an id!' };
        if (channels.find(ch => ch.id === id)) return { err: true, msg: 'Channel id already exists!' };
        if (!title) return { err: true, msg: 'You must supply a title!' };
        if (!assets || !assets.endsWith('/')) return { err: true, msg: 'Assets path must end with /' };
        if (!channelart || !channelart.endsWith('/')) return { err: true, msg: 'Channelart path must end with /' };

        const newChannel = { id, title, assets, channelart };
        if (target) newChannel.target = target;
        if (videoformat) newChannel.videoformat = videoformat;

        setChannels(prev => [...prev, newChannel]);
        return { success: true };
    };

    const removeChannel = (id) => {
        setChannels(prev => prev.filter(ch => ch.id !== id));
    };

    const resetChannels = () => {
        setChannels(DEFAULT_CHANNELS);
        console.log('Channels reset to defaults');
    };

    const getChannelById = (id) => {
        return channels.find(ch => ch.id === id);
    };

    const value = {
        channels,
        addChannel,
        removeChannel,
        resetChannels,
        getChannelById
    };

    return (
        <ChannelsContext.Provider value={value}>
            {children}
        </ChannelsContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChannels() {
    const context = useContext(ChannelsContext);
    if (!context) {
        throw new Error('useChannels must be used within a ChannelsProvider');
    }
    return context;
}
