import { useState } from 'react';

export const Login = ({ onAuth }: { onAuth: (role: 'boy' | 'girl') => void }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);

    const checkPass = () => {
        const hisPass = import.meta.env.VITE_HIS_PASSCODE;
        const herPass = import.meta.env.VITE_HER_PASSCODE;
        
        if (input === hisPass) {
            onAuth('boy');
        } else if (input === herPass) {
            onAuth('girl');
        } else {
            setError(true);
            setTimeout(() => setError(false), 1500);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') checkPass();
    };

    return (
        <div className="ui-overlay" style={{ backgroundColor: '#242424', flexDirection: 'column' }}>
            <div className="letter-container" style={{ width: '300px' }}>
                <h2 style={{ fontSize: '14px', marginBottom: '20px' }}>ACCESS GRANTED TO:</h2>
                <p style={{ textAlign: 'center', fontSize: '10px' }}>[ENTER SECRET CODE]</p>
                
                <input 
                    type="password" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    style={{ 
                        width: '80%', 
                        padding: '10px', 
                        marginBottom: '10px',
                        textAlign: 'center',
                        fontFamily: 'inherit',
                        border: '4px solid #000'
                    }}
                />

                <button className="close-btn" onClick={checkPass} style={{ width: '100%' }}>
                    UNLOCK
                </button>

                {error && (
                    <p style={{ color: '#ac3232', fontSize: '8px', marginTop: '10px' }}>
                        IDENTIFICATION FAILED.
                    </p>
                )}
            </div>
        </div>
    );
};