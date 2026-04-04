import { useRef } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';

function App() {
    // Reference to the PhaserGame component 
    // (We keep this because we'll use it to listen for your 'openDiary' or 'openGallery' events later!)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} />
        </div>
    );
}

export default App;