import { useEffect, useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { EventBus } from '../src/game/EventBus';
import { LetterUI } from './components/LetterUI';
import { DiaryUI } from './components/DiaryUI';
import { GalleryUI } from './components/GalleryUI';
import { Login } from './components/Login';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [userRole, setUserRole] = useState<'boy' | 'girl' | null>(null);
    const [isAuthed, setIsAuthed] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showLetter, setShowLetter] = useState(false);
    const [showDiary, setShowDiary] = useState(false);
    const [showGallery, setShowGallery] = useState(false);

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

            {showLetter && <LetterUI onClose={handleCloseLetter} />}
            {showDiary && <DiaryUI onClose={handleCloseDiary} />}
            {showGallery && <GalleryUI onClose={handleCloseGallery} />}
        </div>
    );
}

export default App;