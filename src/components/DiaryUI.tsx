import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

export const DiaryUI = ({ onClose }: { onClose: () => void }) => {
    const [spread, setSpread] = useState(0);
    
    const leftPageNum = spread * 2 + 1;
    const rightPageNum = spread * 2 + 2;

    const [leftText, setLeftText] = useState('');
    const [rightText, setRightText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false); // NEW: Tracks if fetch is complete

    const readyToClose = useRef(false);

    const textareaStyle: React.CSSProperties = {
        flex: 1,
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        resize: 'none',
        fontSize: '17px',
        lineHeight: '27px',
        fontFamily: '"Georgia", serif',
        color: '#444',
        padding: '0 5px',
        backgroundImage: 'linear-gradient(#c7b99c 1px, transparent 1px)',
        backgroundSize: '100% 27px',
    };

    const navButtonStyle: React.CSSProperties = {
        padding: '10px 20px',
        backgroundColor: 'transparent',
        border: '2px solid #a1887f',
        color: '#f4ebd8',
        fontFamily: '"Verdana", sans-serif',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderRadius: '4px'
    };

    useEffect(() => {
        const fetchPages = async () => {
            setIsLoaded(false); // Reset loading state when flipping pages
            setLeftText('');
            setRightText('');
            
            const { data, error } = await supabase
                .from('diary_entries')
                .select('*')
                .in('page_number', [leftPageNum, rightPageNum]);

            if (!error && data) {
                const leftData = data.find(d => d.page_number === leftPageNum);
                const rightData = data.find(d => d.page_number === rightPageNum);
                
                if (leftData) setLeftText(leftData.content);
                if (rightData) setRightText(rightData.content);
            }
            
            setIsLoaded(true); // Data is fetched, it's now safe to save edits
        };
        fetchPages();
    }, [leftPageNum, rightPageNum]);

    useEffect(() => {
        const channel = supabase.channel('diary_realtime')
            .on(
                'postgres_changes', 
                { event: '*', schema: 'public', table: 'diary_entries' }, 
                (payload) => {
                    const updatedEntry = payload.new as any;
                    
                    if (updatedEntry) {
                        if (updatedEntry.page_number === leftPageNum) {
                            setLeftText(updatedEntry.content);
                        } else if (updatedEntry.page_number === rightPageNum) {
                            setRightText(updatedEntry.content);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [leftPageNum, rightPageNum]);

    useEffect(() => {
        // Do not trigger saves if the page data hasn't finished loading yet
        if (!isLoaded) return; 

        const saveToDb = async (pageNum: number, content: string) => {
            if (pageNum === 1) return;
            setIsSaving(true);
            await supabase.from('diary_entries').upsert({ 
                page_number: pageNum, 
                content: content 
            });
            setIsSaving(false);
        };

        const timer = setTimeout(() => {
            // FIXED: Removed the truthy checks so empty strings ("") can successfully save
            if (leftPageNum !== 1) saveToDb(leftPageNum, leftText);
            saveToDb(rightPageNum, rightText);
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [leftText, rightText, leftPageNum, rightPageNum, isLoaded]);

    useEffect(() => {
        const timer = setTimeout(() => readyToClose.current = true, 150);

        const handleKeyUp = (event: KeyboardEvent) => {
            if (readyToClose.current && event.key === 'Escape') {
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
        <div className="ui-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            
            <button 
                onClick={onClose}
                style={{
                    position: 'absolute', top: '20px', right: '20px',
                    padding: '10px 15px', backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white', border: '1px solid white', cursor: 'pointer',
                    fontFamily: 'sans-serif', fontSize: '12px', zIndex: 100
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)'}
            >
                CLOSE [ESC]
            </button>

            <div style={{
                padding: '20px',
                backgroundColor: '#5d4037',
                borderRadius: '15px 15px 15px 15px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.7), inset 0 0 15px rgba(0,0,0,0.5)',
                position: 'relative',
                border: '3px solid #3e2723',
            }}>
                <div style={{ position: 'absolute', top: '10px', left: '10px', width: '20px', height: '20px', borderTop: '2px solid #af9b60', borderLeft: '2px solid #af9b60', borderRadius: '5px 0 0 0' }}/>
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '20px', height: '20px', borderBottom: '2px solid #af9b60', borderRight: '2px solid #af9b60', borderRadius: '0 0 5px 0' }}/>

                <div style={{
                    display: 'flex', width: '850px', height: '550px',
                    backgroundColor: '#f4ebd8',
                    borderRadius: '4px', position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)'
                }}>
                    
                    <div style={{
                        position: 'absolute', left: '50%', top: 0, bottom: 0,
                        width: '30px', transform: 'translateX(-50%)',
                        background: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.1) 75%, rgba(0,0,0,0) 100%)',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }} />
                    <div style={{
                        position: 'absolute', left: '50%', top: 0, bottom: 0,
                        width: '1px', backgroundColor: 'rgba(0,0,0,0.2)', transform: 'translateX(-50%)', zIndex: 11
                    }}/>

                    <div style={{ flex: 1, padding: '50px 40px 40px 50px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #d1c4e9', paddingBottom: '5px', marginBottom: '15px' }}>
                            <h2 style={{ fontFamily: '"Georgia", serif', margin: 0, color: '#5e35b1', fontSize: '22px' }}>Our Journal</h2>
                            <span style={{ fontSize: '12px', color: '#888', fontFamily: 'sans-serif' }}>Pg. {leftPageNum}</span>
                        </div>
                        
                        {leftPageNum === 1 ? (
                            <div style={{ fontSize: '17px', lineHeight: '27px', fontFamily: '"Georgia", serif', color: '#444' }}>
                                <p style={{ marginTop: 0 }}>Welcome to our shared space, my love.</p>
                                <p>I built this so we always have a place to leave notes, memories, and little reminders.</p>
                                <p>Write anything you want on the pages to come. It will be saved here forever.</p>
                                <p style={{ fontSize: '24px', textAlign: 'center', color: '#5e35b1' }}>❤️</p>
                            </div>
                        ) : (
                            <textarea 
                                value={leftText} 
                                onChange={(e) => setLeftText(e.target.value)}
                                style={textareaStyle}
                                placeholder="Type a memory or note here..."
                            />
                        )}
                    </div>

                    <div style={{ flex: 1, padding: '50px 50px 40px 40px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #d1c4e9', paddingBottom: '5px', marginBottom: '15px' }}>
                            <span style={{ fontSize: '12px', color: '#888', fontFamily: 'sans-serif' }}>Pg. {rightPageNum}</span>
                        </div>
                        <textarea 
                            value={rightText} 
                            onChange={(e) => setRightText(e.target.value)}
                            style={textareaStyle}
                            placeholder="...continue writing here."
                        />
                    </div>
                </div>

                <div style={{ position: 'absolute', bottom: '-65px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                        onClick={() => setSpread(s => Math.max(0, s - 1))} 
                        disabled={spread === 0} 
                        style={{ ...navButtonStyle, opacity: spread === 0 ? 0.3 : 1 }}
                        onMouseEnter={(e) => spread !== 0 && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        &larr; Previous Spread
                    </button>
                    
                    <span style={{ color: '#f4ebd8', fontSize: '12px', fontFamily: 'sans-serif', fontStyle: 'italic' }}>
                        {isSaving ? 'Synchronizing with cloud...' : 'Draft saved to database.'}
                    </span>
                    
                    <button 
                        onClick={() => setSpread(s => s + 1)} 
                        style={navButtonStyle}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        Next Spread &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};