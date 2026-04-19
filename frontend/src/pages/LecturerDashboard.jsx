import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { LogOut, QrCode, PlayCircle, AlertTriangle, Users, FileText, UserCircle, Bell } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../lib/api';
import useViewport from '../hooks/useViewport';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function LecturerDashboard() {
    const navigate = useNavigate();
    const { isMobile, isTablet } = useViewport();
    const isCompact = isTablet;
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    const lecturerName = localStorage.getItem('name') || "Lecturer";
    const lecturerIdentifier = localStorage.getItem('identifier') || "N/A";

    // Dashboard Data
    const [analytics, setAnalytics] = useState({
        total_students: 0,
        avg_attendance: 0,
        reports_generated: 0,
        at_risk_students: [],
        module_rates: []
    });

    const [modules, setModules] = useState([]);
    const [notifications, setNotifications] = useState([
        { id: 1, title: "System Ready", message: "Your modules have been synced and are ready for scanning.", type: "info" },
        { id: 2, title: "Report Reminder", message: "Weekly attendance reports for L1 CS are due tomorrow.", type: "warning" }
    ]);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Form Selection
    const [selectedProgramme, setSelectedProgramme] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [selectedModuleValue, setSelectedModuleValue] = useState(''); // Stores course ID

    // Session State
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [activeSessionCode, setActiveSessionCode] = useState(null);

    useEffect(() => {
        if (!token || !userId) {
            navigate('/login');
            return;
        }

        const fetchLecturerData = async () => {
            try {
                const [analyticsRes, coursesRes] = await Promise.all([
                    api.get(`/analytics/lecturer/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/admin/courses', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                
                setAnalytics(analyticsRes.data);
                const myCourses = coursesRes.data.filter(c => c.lecturer_id && String(c.lecturer_id) === String(userId));
                setModules(myCourses);
            } catch (err) {
                console.error("Failed to load lecturer data", err);
            }
        };

        fetchLecturerData();
        const interval = setInterval(fetchLecturerData, 10000);
        return () => clearInterval(interval);
    }, [token, userId, navigate]);

    const availableProgrammes = Array.from(new Set(modules.filter(m => m.programme).map(m => m.programme.name)));
    const availableLevels = Array.from(new Set(modules.filter(m => (!selectedProgramme || m.programme?.name === selectedProgramme)).map(m => m.level)));
    const availableModules = modules.filter(m => 
        (!selectedProgramme || m.programme?.name === selectedProgramme) &&
        (!selectedLevel || m.level === selectedLevel)
    );

    const handleStartSession = () => {
        if (!selectedModuleValue) return;
        setIsSessionActive(true);
        setActiveSessionCode(JSON.stringify({ "course_id": Number(selectedModuleValue), "timestamp": Date.now() }));
    };

    const handleStopSession = () => {
        setIsSessionActive(false);
        setActiveSessionCode(null);
    };

    const logout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const chartData = {
        labels: analytics.module_rates.map(m => m.code),
        datasets: [{
            label: 'Attendance Rate (%)',
            data: analytics.module_rates.map(m => m.rate),
            backgroundColor: analytics.module_rates.map((_, i) => i % 2 === 0 ? '#3b82f6' : '#f59e0b'),
            borderRadius: 4,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context) => `${context.raw}% Rate` } }
        },
        scales: {
            x: { grid: { display: false, drawBorder: false }, ticks: { color: '#64748b' } },
            y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b' }, min: 0, max: 100 }
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%',
            position: isCompact ? 'relative' : 'fixed', top: 0, left: 0,
            background: 'transparent', color: '#f8fafc',
            fontFamily: "'Outfit', sans-serif", overflowY: 'auto', zIndex: 100
        }}>
            
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '0.75rem' : 0,
                padding: isCompact ? '1rem 1.25rem' : '1.2rem 3rem', background: 'rgba(11, 17, 32, 0.35)',
                backdropFilter: 'blur(4px)', borderBottom: '1px solid rgba(255,255,255,0.05)',
                position: 'sticky', top: 0, zIndex: 110
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#2563eb', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                        <QrCode size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Ml smart attend</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-end' }}>
                    <div style={{ position: 'relative' }}>
                        <div onClick={() => setShowNotifications(!showNotifications)} style={{ cursor: 'pointer', position: 'relative', display: 'flex', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Bell size={20} color="#94a3b8" />
                            {notifications.length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', height: '18px', minWidth: '18px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: '#fff', border: '2px solid #0f172a' }}>{notifications.length}</span>}
                        </div>
                        
                        {showNotifications && (
                            <div style={{ position: 'absolute', top: '120%', right: 0, width: '300px', background: 'rgba(11, 17, 32, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 200 }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Lecturer Notifications</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {notifications.map(n => (
                                        <div key={n.id} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: `4px solid ${n.type === 'warning' ? '#f59e0b' : '#3b82f6'}` }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '2px' }}>{n.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{n.message}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '100%' }}>
                        <div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{lecturerName} ({lecturerIdentifier})</span>
                    </div>
                    <LogOut size={20} color="#94a3b8" style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={logout} onMouseOver={(e) => e.target.style.color='#ef4444'} onMouseOut={(e) => e.target.style.color='#94a3b8'} />
                </div>
            </header>

            <main style={{ padding: isCompact ? '1rem' : '2rem 3rem', flex: 1, display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'minmax(300px, 350px) 1fr', gap: '2rem' }}>
                <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem', height: 'fit-content' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 2rem 0' }}>{isSessionActive ? 'Active Session' : 'Start Attendance Session'}</h2>
                    
                    {!isSessionActive ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Programme</label>
                                <select value={selectedProgramme} onChange={(e) => setSelectedProgramme(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(11, 17, 32, 0.25)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}>
                                    <option value="">All Programmes...</option>
                                    {availableProgrammes.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Level</label>
                                <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(11, 17, 32, 0.25)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}>
                                    <option value="">All Levels...</option>
                                    {availableLevels.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Module</label>
                                <select value={selectedModuleValue} onChange={(e) => setSelectedModuleValue(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(11, 17, 32, 0.25)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '8px', outline: 'none' }}>
                                    <option value="">Select Module...</option>
                                    {availableModules.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                                </select>
                            </div>

                            <button onClick={handleStartSession} disabled={!selectedModuleValue} style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '14px', background: selectedModuleValue ? '#2563eb' : '#1e3a8a',
                                color: selectedModuleValue ? '#fff' : '#64748b', cursor: selectedModuleValue ? 'pointer' : 'not-allowed',
                                border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', marginTop: '1rem', transition: 'all 0.2s'
                            }}>
                                <PlayCircle size={20} />
                                Start Scanning Session
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                            <p style={{ color: '#10b981', textAlign: 'center', margin: 0, fontWeight: 'bold' }}>Session Live for {availableModules.find(m => String(m.id) === String(selectedModuleValue))?.code}</p>
                            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                                <QRCodeSVG value={activeSessionCode} size={isMobile ? 200 : 250} />
                            </div>
                            <button onClick={handleStopSession} style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '14px', background: '#ef4444', color: '#fff', cursor: 'pointer',
                                border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s'
                            }}>
                                End Session
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }}>
                        <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                <span>Total Students</span>
                                <Users size={16} />
                            </div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#60a5fa' }}>{analytics.total_students}</div>
                        </div>
                        <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                <span>Avg Attendance</span>
                            </div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#10b981' }}>{analytics.avg_attendance}%</div>
                        </div>
                        <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                <span>At-Risk Students</span>
                                <AlertTriangle size={16} color="#f59e0b" />
                            </div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#f59e0b' }}>{analytics.at_risk_students.length}</div>
                        </div>
                        <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                <span>Reports Generated</span>
                                <FileText size={16} color="#c084fc" />
                            </div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#c084fc' }}>{analytics.reports_generated}</div>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>Module Attendance Engagement</h3>
                        </div>
                        <div style={{ height: '250px', position: 'relative' }}>
                            {analytics.module_rates.length > 0 ? (
                                <Bar data={chartData} options={chartOptions} />
                            ) : (
                                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No modules mapped yet.</div>
                            )}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '2rem' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <AlertTriangle size={20} color="#f59e0b" />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>At-Risk Students (ML Feedback)</h3>
                        </div>

                        {analytics.at_risk_students.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {analytics.at_risk_students.map((student, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%' }}><UserCircle size={24} color="#94a3b8" /></div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{student.name}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{student.identifier}</div>
                                            </div>
                                        </div>
                                        <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.95rem' }}>{student.risk}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No students currently identified as high risk. Excellent!</div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
