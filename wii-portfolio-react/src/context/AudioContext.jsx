import { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { Howl, Howler } from 'howler';

const AudioContext = createContext(null);

export function AudioProvider({ children, config }) {
  const bgMusicRef = useRef(null);
  const introBgMusicRef = useRef(null);

  // Initialize background music
  const initBgMusic = useCallback(() => {
    if (!bgMusicRef.current) {
      bgMusicRef.current = new Howl({
        src: [`${window.location.origin}/audio/bg-music.mp3`],
        volume: config?.musicVol || 0.5,
        loop: true
      });
    }
  }, [config?.musicVol]);

  // Handle visibility change to mute/unmute globally
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        Howler.mute(true);
      } else {
        Howler.mute(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Play a single SFX
  const playSFX = useCallback((name, vol) => {
    if (!name || vol === undefined) return;
    new Howl({
      src: [`${window.location.origin}/audio/${name}`],
      volume: vol,
      autoplay: true
    });
  }, []);

  // Play multiple SFX
  const playSFXMulti = useCallback((vol, names) => {
    if (!Array.isArray(names)) return;
    names.forEach(name => {
      new Howl({
        src: [`${window.location.origin}/audio/${name}`],
        volume: vol,
        autoplay: true
      });
    });
  }, []);

  // Toggle background music
  const bgMusicToggle = useCallback((forceToggle) => {
    initBgMusic();
    const bgMusic = bgMusicRef.current;
    if (!bgMusic) return;

    if (forceToggle !== undefined) {
      if (forceToggle) {
        bgMusic.play();
      } else {
        bgMusic.pause();
      }
    } else if (bgMusic.playing()) {
      bgMusic.pause();
    } else {
      bgMusic.play();
    }
  }, [initBgMusic]);

  // Toggle intro music
  const bgMusicIntroToggle = useCallback((forceToggle) => {
    const introBgMusic = introBgMusicRef.current;
    if (!introBgMusic) return;

    if (forceToggle !== undefined) {
      if (forceToggle) {
        introBgMusic.play();
      } else {
        introBgMusic.pause();
      }
    } else if (introBgMusic.playing()) {
      introBgMusic.pause();
    } else {
      introBgMusic.play();
    }
  }, []);

  // Set background music
  const setBGMusic = useCallback((fileLocation, introLocation) => {
    // Stop and unload existing background music
    if (bgMusicRef.current) {
      bgMusicRef.current.stop();
      bgMusicRef.current.unload();
    }

    // Stop and unload existing intro music
    if (introBgMusicRef.current) {
      introBgMusicRef.current.stop();
      introBgMusicRef.current.unload();
    }

    bgMusicRef.current = new Howl({
      src: [`${window.location.origin}/${fileLocation}`],
      volume: config?.musicVol || 0.5,
      loop: true
    });

    if (introLocation) {
      introBgMusicRef.current = new Howl({
        src: [`${window.location.origin}/${introLocation}`],
        volume: config?.musicVol || 0.5,
        autoplay: true
      });

      introBgMusicRef.current.on('end', () => {
        bgMusicToggle(true);
      });
    }
  }, [config?.musicVol, bgMusicToggle]);

  // Get bgMusic state
  const getBGMusicState = useCallback(() => {
    return {
      intro: introBgMusicRef.current?.playing() || false,
      main: bgMusicRef.current?.playing() || false
    };
  }, []);

  const value = {
    playSFX,
    playSFXMulti,
    bgMusicToggle,
    bgMusicIntroToggle,
    setBGMusic,
    getBGMusicState,
    initBgMusic
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
