import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Brain, BarChart, ShieldCheck, Users, SlidersHorizontal } from 'lucide-react';
import useViewport from '../hooks/useViewport';

export default function Landing() {
    const navigate = useNavigate();
    const { isMobile, isTablet } = useViewport();
    const isCompact = isTablet;

    const backgroundFeatures = [
        { title: "QR Scanning", desc: "Instant scan-to-mark functionality for seamless attendance tracking.", icon: QrCode },
        { title: "ML Predictions", desc: "Highlights at-risk student monitoring with predictive analytics.", icon: Brain },
        { title: "Visual Analytics", desc: "Showcases rich charts and insights for decision-makers.", icon: BarChart },
        { title: "Anti-Proxy", desc: "Reinforces security via time-limited, dynamic QR tokens.", icon: ShieldCheck },
        { title: "Three Portals", desc: "Role-based customized dashboards for Students, Lecturers, and Admins.", icon: Users },
        { title: "Dynamic Selection", desc: "Select specific Programmes, Modules, and Levels for total flexibility.", icon: SlidersHorizontal }
    ];

    return (
        <div className="animate-fade-in" style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Outfit', sans-serif",
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Ambient Background Effects */}
            <div style={{
                position: 'fixed',
                top: '-10%',
                left: '-10%',
                width: '60vw',
                height: '60vw',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0) 70%)',
                zIndex: 0,
                pointerEvents: 'none'
            }}></div>

            <div style={{
                position: 'fixed',
                bottom: '-20%',
                right: '-10%',
                width: '70vw',
                height: '70vw',
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, rgba(15, 23, 42, 0) 70%)',
                zIndex: 0,
                pointerEvents: 'none'
            }}></div>

            {/* Header */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '1rem' : 0,
                padding: isCompact ? '1.5rem' : '2rem 4rem',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        background: '#2563eb',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)'
                    }}>
                        <QrCode size={24} color="#ffffff" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.5px' }}>SmartAttend</span>
                </div>
                <button
                    onClick={() => navigate('/login')}
                    style={{
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        padding: '0.6rem 1.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.5)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(37, 99, 235, 0.39)';
                    }}
                >
                    Access Portal
                </button>
            </header>

            {/* Main Content */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: isCompact ? '1rem 1.25rem 2rem' : '0 2rem',
                zIndex: 10,
                marginTop: isCompact ? 0 : '-10vh'
            }}>
                <h1 style={{
                    fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
                    fontWeight: '900',
                    lineHeight: '1.2',
                    marginBottom: '1.5rem',
                    letterSpacing: '-2px',
                    background: 'linear-gradient(to bottom right, #ffffff 40%, #94a3b8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    Attendance, Reimagined
                </h1>

                <p style={{
                    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                    color: '#94a3b8',
                    maxWidth: '550px',
                    marginBottom: isCompact ? '2.5rem' : '4rem',
                    lineHeight: '1.6',
                    fontWeight: '300'
                }}>
                    QR-code based smart attendance with ML-powered insights for all academic levels.
                </p>

                <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            background: '#2563eb',
                            color: 'white',
                            border: '1px solid #3b82f6',
                            padding: '1rem 2rem',
                            borderRadius: '12px',
                            fontSize: '1.05rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(37, 99, 235, 0.5)';
                            e.currentTarget.style.background = '#3b82f6';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(37, 99, 235, 0.3)';
                            e.currentTarget.style.background = '#2563eb';
                        }}
                    >
                        I'm a Student
                    </button>

                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            background: 'rgba(30, 41, 59, 0.5)',
                            backdropFilter: 'blur(4px)',
                            color: '#f1f5f9',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '1rem 2rem',
                            borderRadius: '12px',
                            fontSize: '1.05rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        I'm a Lecturer
                    </button>

                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            background: 'rgba(30, 41, 59, 0.5)',
                            backdropFilter: 'blur(4px)',
                            color: '#f1f5f9',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '1rem 2rem',
                            borderRadius: '12px',
                            fontSize: '1.05rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        Administration
                    </button>
                </div>
            </main>
        </div>
    );
}

