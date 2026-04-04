import { useEffect, useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { EventBus } from '../src/game/EventBus';
import { LetterUI } from './components/LetterUI';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    
    const [showLetter, setShowLetter] = useState(false);

    useEffect(() => {
        EventBus.on('open-paper', () => {
            setShowLetter(true);
            EventBus.emit('interaction-start');
        });

        return () => {
            EventBus.removeListener('open-paper');
        };
    }, []);

    const handleCloseLetter = () => {
        setShowLetter(false);
        EventBus.emit('interaction-end');
    };

    return (
        <div id="app" style={{ position: 'relative' }}>
            <PhaserGame ref={phaserRef} />
            
            {showLetter && <LetterUI onClose={handleCloseLetter} />}
        </div>
    );
}

export default App;