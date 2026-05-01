import React from 'react';
import { QrCode, Brain, BarChart, ShieldCheck, Users, SlidersHorizontal } from 'lucide-react';

export default function BackgroundPattern() {
    const backgroundFeatures = [
        { title: "QR Scanning", desc: "Instant scan-to-mark functionality for seamless attendance tracking.", icon: QrCode },
        { title: "ML Predictions", desc: "Highlights at-risk student monitoring with predictive analytics.", icon: Brain },
        { title: "Visual Analytics", desc: "Showcases rich charts and insights for decision-makers.", icon: BarChart },
        { title: "Anti-Proxy", desc: "Reinforces security via time-limited, dynamic QR tokens.", icon: ShieldCheck },
        { title: "Three Portals", desc: "Role-based customized dashboards for Students, Lecturers, and Admins.", icon: Users },
        { title: "Dynamic Selection", desc: "Select specific Programmes, Modules, and Levels for total flexibility.", icon: SlidersHorizontal }
    ];

    return (
        <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            padding: '10vh 5vw',
            opacity: 0.15,
            pointerEvents: 'none',
            zIndex: 0,
            alignContent: 'center'
        }}>
            {backgroundFeatures.map((feat, idx) => (
                <div key={idx} style={{
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: '16px',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <feat.icon size={36} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0 }}>{feat.title}</h3>
                    <p style={{ fontSize: '1rem', margin: 0, lineHeight: 1.5 }}>{feat.desc}</p>
                </div>
            ))}
        </div>
    );
}
