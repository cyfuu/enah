import { useEffect, useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { EventBus } from '../src/game/EventBus';
import { LetterUI } from './components/LetterUI';
import { DiaryUI } from './components/DiaryUI';
import { GalleryUI } from './components/GalleryUI';
import { Login } from './components/Login';

type DirectionKey = 'up' | 'down' | 'left' | 'right';

interface MobileDirectionState {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
}

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [userRole, setUserRole] = useState<'boy' | 'girl' | null>(null);
    const [isAuthed, setIsAuthed] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showLetter, setShowLetter] = useState(false);
    const [showDiary, setShowDiary] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [showMobileControls, setShowMobileControls] = useState(false);
    const [mobileDirections, setMobileDirections] = useState<MobileDirectionState>({
        up: false,
        down: false,
        left: false,
        right: false
    });

    useEffect(() => {
        const shouldEnableMobileControls = () => {
            const params = new URLSearchParams(window.location.search);
            const forced = params.get('mobileControls') === '1';
            const disabled = params.get('mobileControls') === '0';
            if (disabled) return false;

            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const hasCoarsePointer = typeof window.matchMedia === 'function'
                && window.matchMedia('(any-pointer: coarse)').matches;
            const mobileUA = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
            const smallViewport = Math.min(window.innerWidth, window.innerHeight) <= 900;

            return forced || mobileUA || (hasTouch && (hasCoarsePointer || smallViewport));
        };

        const updateControlsVisibility = () => {
            setShowMobileControls(shouldEnableMobileControls());
        };

        updateControlsVisibility();
        window.addEventListener('resize', updateControlsVisibility);
        return () => window.removeEventListener('resize', updateControlsVisibility);
    }, []);

    useEffect(() => {
        if (!showMobileControls) return;

        EventBus.emit('mobile-direction-change', mobileDirections);
    }, [mobileDirections, showMobileControls]);

    useEffect(() => {
        return () => {
            EventBus.emit('mobile-direction-change', {
                up: false,
                down: false,
                left: false,
                right: false
            });
        };
    }, []);

    useEffect(() => {
        if (!isAuthed || !userRole) return;

        const handleGameReady = () => {
            if (userRole) {
                EventBus.emit('set-user-role', userRole);
            }
        };

        const handleOpenPaper = () => {
            setShowLetter(true);
            EventBus.emit('interaction-start');
        };

        const handleOpenDiary = () => {
            setShowDiary(true);
            EventBus.emit('interaction-start');
        };

        const handleOpenGallery = () => {
            setShowGallery(true);
            EventBus.emit('interaction-start');
        };

        EventBus.on('game-ready', handleGameReady);
        EventBus.on('open-paper', handleOpenPaper);
        EventBus.on('open-diary', handleOpenDiary);
        EventBus.on('open-gallery', handleOpenGallery);
        return () => {
            EventBus.removeListener('open-paper', handleOpenPaper);
            EventBus.removeListener('open-diary', handleOpenDiary);
            EventBus.removeListener('open-gallery', handleOpenGallery);
            EventBus.removeListener('game-ready', handleGameReady);
        };
    }, [isAuthed, userRole]);

    const handleCloseLetter = () => {
        setShowLetter(false);
        EventBus.emit('interaction-end');
    };

    const handleCloseDiary = () => {
        setShowDiary(false);
        EventBus.emit('interaction-end');
    };
    
    const handleCloseGallery = () => {
        setShowGallery(false);
        EventBus.emit('interaction-end');
    };
    const toggleMute = () => {
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);
        
        if (phaserRef.current && phaserRef.current.game) {
            phaserRef.current.game.sound.mute = newMuteState;
        }
    };

    const setDirection = (direction: DirectionKey, isPressed: boolean) => {
        setMobileDirections((prev) => {
            if (prev[direction] === isPressed) return prev;
            return {
                ...prev,
                [direction]: isPressed
            };
        });
    };

    const releaseAllDirections = () => {
        setMobileDirections({ up: false, down: false, left: false, right: false });
    };

    const mobileButtonBaseStyle: React.CSSProperties = {
        border: '2px solid rgba(255, 255, 255, 0.8)',
        background: 'rgba(0, 0, 0, 0.58)',
        color: '#ffffff',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
    };

    if (!isAuthed) {
        return <Login onAuth={(role) => {
            setUserRole(role);
            setIsAuthed(true);
        }} />;
    }

    return (
        <div id="app" style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <PhaserGame ref={phaserRef} />
            
            <button 
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 2000,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    border: '2px solid rgba(255, 255, 255, 0.8)',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'}
            >
                {isMuted ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                        <line x1="23" y1="9" x2="17" y2="15"></line>
                        <line x1="17" y1="9" x2="23" y2="15"></line>
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                )}
            </button>

            {showMobileControls && (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-190px)',
                            bottom: '20px',
                            zIndex: 2000,
                            width: '152px',
                            height: '152px',
                            pointerEvents: 'auto'
                        }}
                        onPointerUp={releaseAllDirections}
                        onPointerCancel={releaseAllDirections}
                        onPointerLeave={releaseAllDirections}
                    >
                        <button
                            style={{ ...mobileButtonBaseStyle, position: 'absolute', left: '48px', top: '0px', width: '56px', height: '56px', borderRadius: '14px' }}
                            onPointerDown={() => setDirection('up', true)}
                            onPointerUp={() => setDirection('up', false)}
                            onPointerCancel={() => setDirection('up', false)}
                        >
                            ▲
                        </button>
                        <button
                            style={{ ...mobileButtonBaseStyle, position: 'absolute', left: '48px', bottom: '0px', width: '56px', height: '56px', borderRadius: '14px' }}
                            onPointerDown={() => setDirection('down', true)}
                            onPointerUp={() => setDirection('down', false)}
                            onPointerCancel={() => setDirection('down', false)}
                        >
                            ▼
                        </button>
                        <button
                            style={{ ...mobileButtonBaseStyle, position: 'absolute', left: '0px', top: '48px', width: '56px', height: '56px', borderRadius: '14px' }}
                            onPointerDown={() => setDirection('left', true)}
                            onPointerUp={() => setDirection('left', false)}
                            onPointerCancel={() => setDirection('left', false)}
                        >
                            ◀
                        </button>
                        <button
                            style={{ ...mobileButtonBaseStyle, position: 'absolute', right: '0px', top: '48px', width: '56px', height: '56px', borderRadius: '14px' }}
                            onPointerDown={() => setDirection('right', true)}
                            onPointerUp={() => setDirection('right', false)}
                            onPointerCancel={() => setDirection('right', false)}
                        >
                            ▶
                        </button>
                    </div>

                    <button
                        style={{
                            ...mobileButtonBaseStyle,
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(118px)',
                            bottom: '28px',
                            zIndex: 2000,
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            fontSize: '16px'
                        }}
                        onPointerDown={() => EventBus.emit('mobile-interact-press')}
                    >
                        Use
                    </button>
                </>
            )}

            {showLetter && <LetterUI onClose={handleCloseLetter} />}
            {showDiary && <DiaryUI onClose={handleCloseDiary} />}
            {showGallery && <GalleryUI onClose={handleCloseGallery} />}
        </div>
    );
}

export default App;