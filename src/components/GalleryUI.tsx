import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

interface Photo {
    id: string;
    image_url: string;
    created_at: string;
    caption: string;
}

interface Sticker {
    id: string;
    emoji: string;
    x: number;
    y: number;
    spread: number;
    rotate: number;
}

const EMOJI_LIST = [
    '✨', '💖', '🌸', '🦋', '🎀', '🧸', '🌷', '☁️', 
    '🍓', '💌', '🐾', '🍒', '🪴', '🍄', '⭐', '🎵'
];

const compressImage = (file: File, quality = 0.7, maxWidth = 800): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Failed to get canvas context"));
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error("Canvas compression failed"));
                    
                    const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                    const compressedFile = new File([blob], newFileName, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const PuffySticker = ({ id, emoji, x, y, rotate, onDelete, onUpdate }: any) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [pos, setPos] = useState({ x, y });
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;

        setIsDragging(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        
        dragOffset.current = {
            x: e.clientX - rect.left - rect.width / 2,
            y: e.clientY - rect.top - rect.height / 2
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const container = document.getElementById('album-container');
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const newX = ((e.clientX - rect.left - dragOffset.current.x) / rect.width) * 100;
            const newY = ((e.clientY - rect.top - dragOffset.current.y) / rect.height) * 100;

            setPos({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                onUpdate(id, pos.x, pos.y);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, pos, id, onUpdate]);

    return (
        <div 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={handleMouseDown}
            style={{
                position: 'absolute',
                top: `${pos.y}%`, 
                left: `${pos.x}%`,
                transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                zIndex: isDragging ? 1000 : 20, 
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none'
            }}
        >
            {isHovered && !isDragging && (
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        onDelete(id); 
                    }}
                    style={{
                        position: 'absolute', top: '-10px', right: '-10px',
                        width: '20px', height: '20px', borderRadius: '50%',
                        backgroundColor: '#ff4b4b', color: 'white', border: 'none',
                        cursor: 'pointer', display: 'flex', justifyContent: 'center',
                        alignItems: 'center', fontSize: '12px', fontWeight: 'bold',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)', zIndex: 30
                    }}
                >
                    &times;
                </button>
            )}
            <div style={{
                fontSize: '42px', 
                lineHeight: '1',
                pointerEvents: 'none', 
                filter: `
                    drop-shadow(3px 0px 0px white) 
                    drop-shadow(0px 3px 0px white) 
                    drop-shadow(-3px 0px 0px white) 
                    drop-shadow(0px -3px 0px white)
                    drop-shadow(2px 2px 0px white)
                    drop-shadow(-2px -2px 0px white)
                    drop-shadow(2px -2px 0px white)
                    drop-shadow(-2px 2px 0px white)
                    drop-shadow(0px 6px 6px rgba(0,0,0,0.25))
                `
            }}>
                {emoji}
            </div>
        </div>
    );
};

export const GalleryUI = ({ onClose }: { onClose: () => void }) => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [stickers, setStickers] = useState<Sticker[]>([]);
    const [spread, setSpread] = useState(0);
    const [uiScale, setUiScale] = useState(1);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [hoveredPhotoId, setHoveredPhotoId] = useState<string | null>(null);
    const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [captionText, setCaptionText] = useState('');
    
    const readyToClose = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const updateScale = () => {
            const mobile = window.matchMedia('(max-width: 900px)').matches;
            setIsMobileViewport(mobile);
            if (!mobile) {
                setUiScale(1);
                return;
            }

            const widthScale = (window.innerWidth - 28) / 1080;
            const heightScale = (window.innerHeight - 170) / 780;
            const tunedScale = Math.min(widthScale, heightScale) * 0.88;
            setUiScale(Math.max(0.42, Math.min(1, tunedScale)));
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const [photosRes, stickersRes] = await Promise.all([
                supabase.from('gallery_photos').select('*').order('created_at', { ascending: true }),
                supabase.from('gallery_stickers').select('*')
            ]);

            if (photosRes.data) setPhotos(photosRes.data);
            if (stickersRes.data) setStickers(stickersRes.data);
        };
        fetchData();

        const photoChannel = supabase.channel('gallery_photos_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_photos' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setPhotos(prev => {
                        if (!prev.find(p => p.id === payload.new.id)) {
                            return [...prev, payload.new as Photo];
                        }
                        return prev;
                    });
                } else if (payload.eventType === 'DELETE') {
                    setPhotos(prev => prev.filter(p => p.id !== payload.old.id));
                }
            }).subscribe();

        const stickerChannel = supabase.channel('gallery_stickers_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_stickers' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setStickers(prev => {
                        if (!prev.find(s => s.id === payload.new.id)) {
                            return [...prev, payload.new as Sticker];
                        }
                        return prev;
                    });
                } else if (payload.eventType === 'UPDATE') {
                    setStickers(prev => prev.map(s => s.id === payload.new.id ? (payload.new as Sticker) : s));
                } else if (payload.eventType === 'DELETE') {
                    setStickers(prev => prev.filter(s => s.id !== payload.old.id));
                }
            }).subscribe();

        return () => {
            supabase.removeChannel(photoChannel);
            supabase.removeChannel(stickerChannel);
        };
    }, []);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setPendingFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setCaptionText('');
    };

    const confirmUpload = async () => {
        if (!pendingFile) return;
        setIsUploading(true);

        try {
            const compressedFile = await compressImage(pendingFile, 0.7, 800);

            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('polaroids').upload(fileName, compressedFile);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('polaroids').getPublicUrl(fileName);
            const { data: insertData, error: dbError } = await supabase
                .from('gallery_photos')
                .insert([{ image_url: publicUrl, caption: captionText }])
                .select();

            if (dbError) throw dbError;
            if (insertData) {
                setPhotos(prev => {
                    if (!prev.find(p => p.id === insertData[0].id)) {
                        return [...prev, insertData[0]];
                    }
                    return prev;
                });
                setSpread(Math.floor(photos.length / 4));
            }
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Oops! The photo couldn't be uploaded.");
        } finally {
            setIsUploading(false);
            setPendingFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const cancelUpload = () => {
        setPendingFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeletePhoto = async (photoId: string, imageUrl: string) => {
        const confirmDelete = window.confirm("Are you sure you want to remove this memory?");
        if (!confirmDelete) return;

        try {
            await supabase.from('gallery_photos').delete().eq('id', photoId);
            const fileName = imageUrl.split('/').pop();
            if (fileName) await supabase.storage.from('polaroids').remove([fileName]);
            
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            if (photos.length - 1 <= spread * 4 && spread > 0) setSpread(spread - 1);
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    const handleUpdateSticker = async (id: string, x: number, y: number) => {
        setStickers(prev => prev.map(s => s.id === id ? { ...s, x, y } : s));
        const { error } = await supabase
            .from('gallery_stickers')
            .update({ x, y })
            .eq('id', id);
            
        if (error) console.error("Failed to sync sticker position:", error);
    };

    const handleAlbumClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!selectedEmoji) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const rotate = Math.floor(Math.random() * 60) - 30;
        const newSticker = { emoji: selectedEmoji, x, y, spread, rotate };

        const tempId = Math.random().toString();
        setStickers([...stickers, { id: tempId, ...newSticker }]);
        setSelectedEmoji(null);

        const { data, error } = await supabase.from('gallery_stickers').insert([newSticker]).select();
        if (data && data[0]) {
            setStickers(prev => prev.map(s => s.id === tempId ? data[0] : s));
        } else if (error) {
            console.error("Sticker save failed:", error);
            setStickers(prev => prev.filter(s => s.id !== tempId));
        }
    };

    const handleDeleteSticker = async (stickerId: string) => {
        setStickers(prev => prev.filter(s => s.id !== stickerId));
        await supabase.from('gallery_stickers').delete().eq('id', stickerId);
    };

    useEffect(() => {
        const timer = setTimeout(() => readyToClose.current = true, 150);
        const handleKeyUp = (event: KeyboardEvent) => {
            if (readyToClose.current && event.key === 'Escape' && !pendingFile) {
                if (selectedEmoji) setSelectedEmoji(null);
                else onClose();
            }
        };
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keyup', handleKeyUp);
            clearTimeout(timer);
        };
    }, [onClose, pendingFile, selectedEmoji]);

    const startIndex = spread * 4;
    const currentPhotos = photos.slice(startIndex, startIndex + 4);
    const leftPagePhotos = currentPhotos.slice(0, 2);
    const rightPagePhotos = currentPhotos.slice(2, 4);
    const currentStickers = stickers.filter(s => s.spread === spread);

    const renderPolaroid = (photo: Photo) => {
        const tilt = (photo.id.charCodeAt(0) % 10) - 5; 
        const isHovered = hoveredPhotoId === photo.id;
        
        return (
            <div 
                key={photo.id} 
                onMouseEnter={() => setHoveredPhotoId(photo.id)}
                onMouseLeave={() => setHoveredPhotoId(null)}
                style={{
                    backgroundColor: '#ffffff',
                    padding: '10px 10px 15px 10px',
                    boxShadow: '0 6px 15px rgba(0,0,0,0.15)',
                    transform: `rotate(${tilt}deg)`,
                    width: '180px',
                    height: '220px',
                    margin: '15px',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease',
                    position: 'relative',
                    zIndex: 5
                }}
            >
                <button 
                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id, photo.image_url); }}
                    style={{
                        position: 'absolute', top: '-10px', right: '-10px',
                        width: '24px', height: '24px', borderRadius: '50%',
                        backgroundColor: '#ff4b4b', color: 'white', border: 'none',
                        cursor: 'pointer', display: 'flex', justifyContent: 'center',
                        alignItems: 'center', fontSize: '14px', fontWeight: 'bold',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.3)', zIndex: 10,
                        opacity: isHovered ? 1 : 0,
                        pointerEvents: isHovered ? 'auto' : 'none',
                        transition: 'opacity 0.2s ease'
                    }}
                >
                    &times;
                </button>
                <div style={{ flex: 1, backgroundImage: `url(${photo.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#eee' }} />
                <div style={{ height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Caveat", cursive', fontSize: '18px', color: '#2b2b2b', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {photo.caption}
                </div>
            </div>
        );
    };

    return (
        <div className="ui-overlay" style={{ 
            backgroundColor: 'rgba(0,0,0,0.85)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            width: '100vw',
            position: 'fixed',
            top: 0, 
            left: 0, 
            zIndex: 99999,
        }}>
            <button 
                onClick={onClose} 
                style={{ 
                    position: 'fixed', 
                    top: '20px', 
                    right: '20px', 
                    padding: '10px 15px', 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    color: 'white', 
                    border: '1px solid white', 
                    cursor: 'pointer', 
                    fontSize: '12px', 
                    borderRadius: '4px' 
                }}
            >
                CLOSE [ESC]
            </button>

            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                position: 'relative',
                transform: `scale(${uiScale})`,
                transformOrigin: 'center center'
            }}>
                <div style={{
                    padding: '25px 20px',
                    backgroundColor: '#98ab9a',
                    borderRadius: '8px',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
                    border: '2px solid #829484',
                }}>
                    <div 
                        id="album-container"
                        onClick={handleAlbumClick}
                        style={{
                            display: 'flex',
                            width: '850px',
                            height: '550px',
                            backgroundColor: '#fdfbf7',
                            borderRadius: '4px', position: 'relative',
                            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.8), inset 0 0 0 2px rgba(0,0,0,0.05)',
                            overflow: 'hidden',
                            cursor: selectedEmoji ? 'crosshair' : 'default' 
                        }}
                    >
                        {currentStickers.map(sticker => (
                            <PuffySticker 
                                key={sticker.id} 
                                {...sticker} 
                                onDelete={handleDeleteSticker} 
                                onUpdate={handleUpdateSticker} 
                            />
                        ))}
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', backgroundColor: 'rgba(0,0,0,0.08)', transform: 'translateX(-50%)', zIndex: 10 }}/>
                        <div style={{ flex: 1, padding: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', alignContent: 'center', position: 'relative' }}>
                            {leftPagePhotos.map(renderPolaroid)}
                            {photos.length === 0 && (
                                <p style={{ color: '#a0a8a1', fontFamily: 'serif', fontSize: '18px', fontStyle: 'italic', textAlign: 'center', zIndex: 5, pointerEvents: 'none' }}>
                                    This album is empty.<br/>Add our first memory!
                                </p>
                            )}
                        </div>
                        <div style={{ flex: 1, padding: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', alignContent: 'center', position: 'relative' }}>
                            {rightPagePhotos.map(renderPolaroid)}
                        </div>
                        {selectedEmoji && (
                            <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 20px', borderRadius: '20px', fontSize: '14px', zIndex: 100, pointerEvents: 'none', backdropFilter: 'blur(4px)' }}>
                                Click anywhere to place {selectedEmoji} (Press ESC to cancel)
                            </div>
                        )}
                    </div>
                </div>

                {isMobileViewport && (
                    <div style={{
                        width: '850px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        boxSizing: 'border-box'
                    }}>
                        {EMOJI_LIST.map(emoji => (
                            <button
                                key={`mobile-${emoji}`}
                                onClick={() => setSelectedEmoji(selectedEmoji === emoji ? null : emoji)}
                                style={{
                                    flex: '0 0 auto',
                                    fontSize: '24px',
                                    background: selectedEmoji === emoji ? 'rgba(255,255,255,0.8)' : 'white',
                                    border: selectedEmoji === emoji ? '2px solid #98ab9a' : 'none',
                                    borderRadius: '50%',
                                    width: '45px',
                                    height: '45px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                                    transform: selectedEmoji === emoji ? 'scale(0.95)' : 'scale(1)',
                                    transition: 'all 0.1s'
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ width: '850px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => setSpread(s => Math.max(0, s - 1))} disabled={spread === 0} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid white', color: 'white', cursor: spread === 0 ? 'default' : 'pointer', opacity: spread === 0 ? 0.3 : 1, borderRadius: '4px' }}>
                        &larr; Previous Page
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} style={{ padding: '12px 24px', backgroundColor: '#fdfbf7', border: 'none', color: '#526654', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        + Add Polaroid
                    </button>
                    <button onClick={() => setSpread(s => s + 1)} disabled={startIndex + 4 >= photos.length} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid white', color: 'white', cursor: startIndex + 4 >= photos.length ? 'default' : 'pointer', opacity: startIndex + 4 >= photos.length ? 0.3 : 1, borderRadius: '4px' }}>
                        Next Page &rarr;
                    </button>
                </div>
            </div>

            {!isMobileViewport && (
            <div style={{ 
                position: 'fixed', right: '40px', top: '50%', transform: `translateY(-50%) scale(${uiScale})`,
                transformOrigin: 'right center',
                width: '130px',
                display: 'flex',
                justifyContent: 'center',
                gap: '12px', 
                backgroundColor: 'rgba(255,255,255,0.15)', padding: '20px 15px', borderRadius: '12px', 
                flexWrap: 'wrap',
                backdropFilter: 'blur(5px)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                zIndex: 100000
            }}>
                <div style={{ width: '100%', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '10px', marginBottom: '5px', color: 'white', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Stickers
                </div>
                {EMOJI_LIST.map(emoji => (
                    <button 
                        key={emoji}
                        onClick={() => setSelectedEmoji(selectedEmoji === emoji ? null : emoji)}
                        style={{ 
                            fontSize: '24px', background: selectedEmoji === emoji ? 'rgba(255,255,255,0.8)' : 'white', 
                            border: selectedEmoji === emoji ? '2px solid #98ab9a' : 'none', 
                            borderRadius: '50%', width: '45px', height: '45px', 
                            cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center',
                            boxShadow: '0 3px 6px rgba(0,0,0,0.15)', 
                            transform: selectedEmoji === emoji ? 'scale(0.95)' : 'scale(1)',
                            transition: 'all 0.1s'
                        }}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            )}

            {pendingFile && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
                    <div style={{ backgroundColor: '#fdfbf7', padding: '30px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ margin: '0 0 20px 0', color: '#526654' }}>Write a Caption</h3>
                        {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: '200px', height: '200px', objectFit: 'cover', marginBottom: '20px', borderRadius: '4px' }} />}
                        <input type="text" placeholder="A beautiful memory..." value={captionText} onChange={(e) => setCaptionText(e.target.value)} maxLength={25} style={{ width: '100%', padding: '10px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '4px', fontFamily: '"Caveat", cursive', fontSize: '20px', textAlign: 'center' }} />
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={cancelUpload} disabled={isUploading} style={{ padding: '10px 20px', border: '1px solid #ccc', backgroundColor: '#eee', cursor: 'pointer', borderRadius: '4px' }}>Cancel</button>
                            <button onClick={confirmUpload} disabled={isUploading} style={{ padding: '10px 20px', border: 'none', backgroundColor: '#7c9381', color: 'white', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>{isUploading ? 'Saving...' : 'Add to Album'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};