import { createContext, useContext, useState, useEffect } from 'react';

const ConfigContext = createContext(null);

const DEFAULT_CONFIG = {
    musicVol: 0.15,
    sfxVol: 0.15,
};

export function ConfigProvider({ children }) {
    const [config, setConfig] = useState(() => {
        try {
            const stored = localStorage.getItem('adifolio-settings-v4');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load config from localStorage:', e);
        }
        return DEFAULT_CONFIG;
    });

    // Save config to localStorage when it changes
    useEffect(() => {
        try {
            localStorage.setItem('adifolio-settings-v4', JSON.stringify(config));
        } catch (e) {
            console.error('Failed to save config to localStorage:', e);
        }
    }, [config]);

    const updateConfig = (updates) => {
        setConfig(prev => ({ ...prev, ...updates }));
    };

    const resetConfig = () => {
        setConfig(DEFAULT_CONFIG);
        console.log('Config reset to defaults:', DEFAULT_CONFIG);
    };

    const value = {
        config,
        updateConfig,
        resetConfig
    };

    return (
        <ConfigContext.Provider value={value}>
            {children}
        </ConfigContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConfig() {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
}
