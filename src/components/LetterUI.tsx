import { useEffect, useRef } from 'react';

export const LetterUI = ({ onClose }: { onClose: () => void }) => {

    const readyToClose = useRef(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            readyToClose.current = true;
        }, 150);

        const handleKeyUp = (event: KeyboardEvent) => {
            if (readyToClose.current && event.key.toLowerCase() === 'e') {
                onClose();
            }
        };

        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keyup', handleKeyUp);
            clearTimeout(timer);
        };
    }, [onClose]);

    return (
        <div className="ui-overlay">
            <div className="letter-container">
                <h2>HAPPY ANNIVERSARY!</h2>
                <p>
                    MY ENAH, <br/><br/>
                    WELCOME TO OUR SPECIAL PLACE. I BUILT THIS LITTLE WORLD JUST FOR US. <br/><br/>
                    TAKE YOUR TIME, EXPLORE AROUND, AND I HOPE YOU LOVE IT AS MUCH AS I LOVE YOU.
                </p>
                
                <button className="close-btn" onClick={onClose}>
                    CLOSE [E]
                </button>
            </div>
        </div>
    );
};