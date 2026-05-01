import React, { useState, useEffect } from 'react';
import { Settings, Image as ImageIcon, Sun, Moon, Sliders, X, Upload } from 'lucide-react';

export default function ThemeCustomizer() {
    const [isOpen, setIsOpen] = useState(false);
    const [brightness, setBrightness] = useState(parseFloat(localStorage.getItem('theme_brightness') || '1'));
    
    // Apply the Background + Brightness on Mount
    useEffect(() => {
        const customBg = localStorage.getItem('custom_bg');
        if (customBg) {
            document.body.style.backgroundImage = `url(${customBg})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
        }

        // Apply a global filter to the body to handle brightness dynamically
        document.body.style.filter = `brightness(${brightness})`;
    }, [brightness]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64Str = event.target.result;
                
                // Extremely rudimentary sanity check for localStorage limits (keep under 3MB approx)
                if (base64Str.length > 3000000) {
                    alert("Image is too large. Please use an image under 2MB for browser storage.");
                    return;
                }

                localStorage.setItem('custom_bg', base64Str);
                document.body.style.backgroundImage = `url(${base64Str})`;
            };
            reader.readAsDataURL(file);
            e.target.value = null; // reset input
        }
    };

    const resetToAdminDefault = () => {
        localStorage.removeItem('custom_bg');
        document.body.style.backgroundImage = `url('/bg.jpg')`;
    };

    const handleBrightnessChange = (e) => {
        const val = e.target.value;
        setBrightness(val);
        localStorage.setItem('theme_brightness', val);
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: '2rem', right: '2rem', zIndex: 9999,
                    background: 'rgba(11, 17, 32, 0.7)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '50%', padding: '12px',
                    color: '#c084fc', cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                {isOpen ? <X size={24} /> : <Settings size={24} />}
            </button>

            {/* Customizer Panel */}
            {isOpen && (
                <div style={{
                    position: 'fixed', bottom: '5.5rem', right: '2rem', zIndex: 9999,
                    width: '320px', background: 'rgba(17, 24, 39, 0.85)',
                    backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '16px', padding: '1.5rem', color: '#f8fafc',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)', fontFamily: "'Outfit', sans-serif"
                }}>
                    <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                        <Sliders size={18} color="#c084fc" /> Display Preferences
                    </h3>

                    {/* Brightness Control */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.8rem' }}>
                            <span>Brightness Control</span>
                            <span>{Math.round(brightness * 100)}%</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Moon size={16} color="#64748b" />
                            <input 
                                type="range" min="0.3" max="1.2" step="0.05" 
                                value={brightness} onChange={handleBrightnessChange}
                                style={{ flex: 1, accentColor: '#3b82f6', cursor: 'pointer' }}
                            />
                            <Sun size={16} color="#fbbf24" />
                        </div>
                    </div>

                    {/* Personal Background Uploader */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.8rem' }}>
                            Personal Background Override
                        </label>
                        
                        <label style={{
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                            background: 'rgba(59, 130, 246, 0.1)', border: '1px dashed rgba(59, 130, 246, 0.4)',
                            padding: '12px', borderRadius: '8px', cursor: 'pointer', color: '#60a5fa', fontSize: '0.9rem',
                            transition: 'all 0.2s', marginBottom: '0.8rem'
                        }} onMouseOver={(e)=> e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                           onMouseOut={(e)=> e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}>
                            <Upload size={16} /> Choose Image
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                        </label>

                        <button onClick={resetToAdminDefault} style={{
                            width: '100%', padding: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s'
                        }} onMouseOver={(e)=> e.target.style.background = 'rgba(255,255,255,0.05)'}
                           onMouseOut={(e)=> e.target.style.background = 'transparent'}>
                            Revert to Admin Default
                        </button>
                    </div>

                </div>
            )}
        </>
    );
}
