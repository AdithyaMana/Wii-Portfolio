import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { ChannelsProvider, useChannels } from './context/ChannelsContext';
import { AudioProvider, useAudio } from './context/AudioContext';
import { SplashScreen } from './components/SplashScreen';
import { MainMenu } from './components/MainMenu';
import { Cursor } from './components/Cursor';
import './index.css';

// Eagerly loaded component (needed after splash)
import { ChannelSelection } from './components/ChannelSelection';

// Lazy loaded components (only loaded when actually used)
const MessageBoard = lazy(() => import('./components/MessageBoard').then(m => ({ default: m.MessageBoard })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const HomeMenu = lazy(() => import('./components/HomeMenu').then(m => ({ default: m.HomeMenu })));
const ReturnDialog = lazy(() => import('./components/ReturnDialog').then(m => ({ default: m.ReturnDialog })));

function AppContent() {
  const [appState, setAppState] = useState('splash'); // splash, menu, channel
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showMessageBoard, setShowMessageBoard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [isReturning, setIsReturning] = useState(false);


  const { config } = useConfig();
  const { channels } = useChannels();
  const { playSFX, bgMusicToggle, getBGMusicState, bgMusicIntroToggle } = useAudio();

  // Handle splash screen completion
  const handleSplashComplete = useCallback(() => {
    setAppState('menu');
    playSFX('startup.mp3', config.musicVol);
    bgMusicToggle(true);
  }, [playSFX, config.musicVol, bgMusicToggle]);

  // Handle channel selection
  const handleChannelSelect = useCallback((channel) => {
    playSFX('button-select.mp3', config.sfxVol);
    setSelectedChannel(channel);
    setAppState('channel');
  }, [playSFX, config.sfxVol]);

  // Refs for cleanup
  const timeoutsRef = useRef([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  // Handle return from channel
  const handleChannelBack = useCallback(() => {
    setIsReturning(true);

    const t1 = setTimeout(() => {
      setSelectedChannel(null);
      setAppState('menu');
      bgMusicToggle(true);

      const t2 = setTimeout(() => {
        setIsReturning(false);
      }, 1000);
      timeoutsRef.current.push(t2);
    }, 400);
    timeoutsRef.current.push(t1);
  }, [bgMusicToggle]);

  // Handle next channel navigation
  const handleChannelNext = useCallback(() => {
    if (!selectedChannel || !channels.length) return;

    const currentIndex = channels.findIndex(ch => ch.id === selectedChannel.id);
    const nextIndex = (currentIndex + 1) % channels.length;
    const nextChannel = channels[nextIndex];
    playSFX('button-select.mp3', config.sfxVol);
    setSelectedChannel(nextChannel);
  }, [selectedChannel, channels, playSFX, config.sfxVol]);

  // Handle previous channel navigation
  const handleChannelPrev = useCallback(() => {
    if (!selectedChannel || !channels.length) return;

    const currentIndex = channels.findIndex(ch => ch.id === selectedChannel.id);
    const prevIndex = (currentIndex - 1 + channels.length) % channels.length;
    const prevChannel = channels[prevIndex];
    playSFX('button-select.mp3', config.sfxVol);
    setSelectedChannel(prevChannel);
  }, [selectedChannel, channels, playSFX, config.sfxVol]);

  // Handle right-click for home menu
  useEffect(() => {
    let lastBgMusicState = { intro: false, main: false };

    const handleContextMenu = (e) => {
      e.preventDefault();

      if (!showHomeMenu) {
        lastBgMusicState = getBGMusicState();

        if (lastBgMusicState.intro) bgMusicIntroToggle(false);
        if (lastBgMusicState.main) bgMusicToggle(false);

        playSFX('home-in.mp3', config.sfxVol);
        setShowHomeMenu(true);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [showHomeMenu, getBGMusicState, bgMusicIntroToggle, bgMusicToggle, playSFX, config.sfxVol]);

  // Home menu handlers
  const handleHomeMenuClose = () => {
    setShowHomeMenu(false);
    bgMusicToggle(true);
  };

  const handleHomeMenuWiiMenu = () => {
    setShowReturnDialog(true);
  };

  const handleReturnDialogNo = () => {
    setShowReturnDialog(false);
  };

  // Settings handlers
  const handleSettingsOpen = () => {
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
  };

  // Message board handlers
  const handleMessageBoardOpen = () => {
    setShowMessageBoard(true);
  };

  const handleMessageBoardClose = () => {
    setShowMessageBoard(false);
  };

  return (
    <>
      <Cursor />
      {/* Splash Screen */}
      {appState === 'splash' && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      {/* Main Menu */}
      {appState !== 'splash' && (
        <MainMenu
          onChannelSelect={handleChannelSelect}
          onSettingsClick={handleSettingsOpen}
          onMessageBoardClick={handleMessageBoardOpen}
          onHomeClick={() => {
            bgMusicToggle(false);
            setShowHomeMenu(true);
          }}
          isChannelOpen={appState === 'channel'}
          isReturning={isReturning}
        />
      )}

      {/* Channel Selection */}
      {appState === 'channel' && selectedChannel && (
        <ChannelSelection
          channel={selectedChannel}
          onBack={handleChannelBack}
          onNext={handleChannelNext}
          onPrev={handleChannelPrev}
          isReturning={isReturning}
        />
      )}

      {/* Message Board (lazy loaded) */}
      <Suspense fallback={null}>
        {showMessageBoard && (
          <MessageBoard onClose={handleMessageBoardClose} />
        )}

        {/* Settings (lazy loaded) */}
        {showSettings && (
          <Settings onClose={handleSettingsClose} />
        )}

        {/* Home Menu (lazy loaded) */}
        {showHomeMenu && (
          <HomeMenu
            onClose={handleHomeMenuClose}
            onWiiMenu={handleHomeMenuWiiMenu}
          />
        )}

        {/* Return Dialog (lazy loaded) */}
        {showReturnDialog && (
          <ReturnDialog onNo={handleReturnDialogNo} />
        )}
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ConfigProvider>
      <ChannelsProvider>
        <ConfigConsumer />
      </ChannelsProvider>
    </ConfigProvider>
  );
}

// Wrapper to pass config to AudioProvider
function ConfigConsumer() {
  const { config } = useConfig();

  return (
    <AudioProvider config={config}>
      <AppContent />
    </AudioProvider>
  );
}

export default App;
