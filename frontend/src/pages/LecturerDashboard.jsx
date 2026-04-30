import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { LogOut, QrCode, PlayCircle, AlertTriangle, Users, FileText, UserCircle, Bell, MessageSquare, Send, ShieldAlert, CheckCircle } from 'lucide-react';
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

    const [analytics, setAnalytics] = useState({
        total_students: 0,
        avg_attendance: 0,
        reports_generated: 0,
        at_risk_students: [],
        module_rates: []
    });

    const [modules, setModules] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Feedback/Report State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackTarget, setFeedbackTarget] = useState(null); // student object or null for admin
    const [feedbackSubject, setFeedbackSubject] = useState("");
    const [feedbackMessage, setFeedbackMessage] = useState("");

    // Session State
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [activeSessionCode, setActiveSessionCode] = useState(null);

    useEffect(() => {
        if (!token || !userId) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const [analyticsRes, coursesRes, notifRes] = await Promise.all([
                    api.get(`/analytics/lecturer/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/admin/courses', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/notifications/', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                
                setAnalytics(analyticsRes.data);
                const myCourses = coursesRes.data.filter(c => c.lecturer_id && String(c.lecturer_id) === String(userId));
                setModules(myCourses);
                setNotifications(notifRes.data);
            } catch (err) {
                console.error("Failed to load lecturer data", err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [token, userId, navigate]);

    const availableProgrammes = Array.from(new Set(modules.filter(m => m.programme).map(m => m.programme.name)));
    const availableLevels = Array.from(new Set(modules.filter(m => (!selectedProgramme || m.programme?.name === selectedProgramme)).map(m => m.level)));
    
    const [selectedProgramme, setSelectedProgramme] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');
    const [selectedModuleValue, setSelectedModuleValue] = useState('');

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

    const handleSendFeedback = async () => {
        try {
            await api.post('/feedback/', {
                receiver_id: feedbackTarget?.id || null,
                subject: feedbackSubject,
                message: feedbackMessage
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert(`Message sent to ${feedbackTarget ? feedbackTarget.name : 'Administrators'}.`);
            setShowFeedbackModal(false);
            setFeedbackSubject("");
            setFeedbackMessage("");
            setFeedbackTarget(null);
        } catch (err) {
            alert("Failed to send feedback.");
        }
    };

    const markNotificationRead = async (id) => {
        try {
            await api.post(`/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (err) {
            console.error(err);
        }
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
            borderRadius: 8,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (context) => `${context.raw}% Engagement` } }
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
                padding: isCompact ? '1rem 1.25rem' : '1.2rem 3rem', background: 'rgba(11, 17, 32, 0.65)',
                backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)',
                position: 'sticky', top: 0, zIndex: 110
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#3b82f6', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                        <ShieldAlert size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>SmartAttend AI <span style={{fontWeight: '300', fontSize: '0.9rem', color: '#94a3b8'}}>Lecturer</span></span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-end' }}>
                    <div style={{ position: 'relative' }}>
                        <div onClick={() => setShowNotifications(!showNotifications)} style={{ cursor: 'pointer', position: 'relative', display: 'flex', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Bell size={20} color={notifications.some(n => !n.is_read) ? "#f59e0b" : "#94a3b8"} />
                            {notifications.filter(n => !n.is_read).length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#f59e0b', height: '18px', minWidth: '18px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: '#fff', border: '2px solid #0f172a' }}>{notifications.filter(n => !n.is_read).length}</span>}
                        </div>
                        
                        {showNotifications && (
                            <div style={{ position: 'absolute', top: '125%', right: 0, width: '320px', background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '1.2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', zIndex: 200 }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Notifications</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto' }}>
                                    {notifications.length > 0 ? notifications.map(n => (
                                        <div key={n.id} onClick={() => markNotificationRead(n.id)} style={{ cursor: 'pointer', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: `4px solid ${n.type === 'risk' ? '#ef4444' : '#3b82f6'}` }}>
                                            <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '2px' }}>{n.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{n.message}</div>
                                        </div>
                                    )) : <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>No notifications</div>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px 18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{lecturerName}</span>
                    </div>
                    <LogOut size={20} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={logout} />
                </div>
            </header>

            <main style={{ padding: isCompact ? '1rem' : '2rem 3rem', flex: 1, display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'minmax(350px, 400px) 1fr', gap: '2rem' }}>
                
                {/* Session Control Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.2) 100%)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '2rem', height: 'fit-content' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 1.5rem 0' }}>{isSessionActive ? 'Live QR Session' : 'Attendance Portal'}</h2>
                        
                        {!isSessionActive ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Programme</label>
                                    <select value={selectedProgramme} onChange={(e) => setSelectedProgramme(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(11, 17, 32, 0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', outline: 'none' }}>
                                        <option value="">All Programmes...</option>
                                        {availableProgrammes.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Level</label>
                                    <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(11, 17, 32, 0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', outline: 'none' }}>
                                        <option value="">All Levels...</option>
                                        {availableLevels.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Active Module</label>
                                    <select value={selectedModuleValue} onChange={(e) => setSelectedModuleValue(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(11, 17, 32, 0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', outline: 'none' }}>
                                        <option value="">Select Module...</option>
                                        {availableModules.map(m => <option key={m.id} value={m.id}>{m.code} - {m.name}</option>)}
                                    </select>
                                </div>

                                <button onClick={handleStartSession} disabled={!selectedModuleValue} style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    padding: '14px', background: selectedModuleValue ? '#2563eb' : '#1e3a8a',
                                    color: selectedModuleValue ? '#fff' : '#64748b', cursor: selectedModuleValue ? 'pointer' : 'not-allowed',
                                    border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', marginTop: '1rem', boxShadow: selectedModuleValue ? '0 10px 15px -3px rgba(37, 99, 235, 0.3)' : 'none'
                                }}>
                                    <QrCode size={20} />
                                    Generate Session QR
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{ background: '#fff', padding: '2rem', borderRadius: '24px', display: 'flex', justifyContent: 'center', width: '100%', boxShadow: '0 0 40px rgba(255,255,255,0.1)' }}>
                                    <QRCodeSVG value={activeSessionCode} size={isMobile ? 220 : 280} />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>Session Live</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Students can now scan and check-in</div>
                                </div>
                                <button onClick={handleStopSession} style={{
                                    width: '100%', padding: '14px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer'
                                }}>
                                    End Session
                                </button>
                            </div>
                        )}
                    </div>

                    <button onClick={() => setShowFeedbackModal(true)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '24px', color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                        <FileText size={20} /> Generate & Send Report to Admin
                    </button>
                </div>

                {/* Insights & Analytics Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {[
                            { label: 'Total Students', val: analytics.total_students, icon: <Users size={20} />, color: '#60a5fa' },
                            { label: 'Avg Attendance', val: `${analytics.avg_attendance}%`, icon: <CheckCircle size={20} />, color: '#10b981' },
                            { label: 'At-Risk (ML)', val: analytics.at_risk_students.length, icon: <AlertTriangle size={20} />, color: '#ef4444' }
                        ].map((stat, i) => (
                            <div key={i} style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', marginBottom: '12px', fontSize: '0.9rem', fontWeight: '500' }}>
                                    <span>{stat.label}</span>
                                    {stat.icon}
                                </div>
                                <div style={{ fontSize: '2.4rem', fontWeight: 'bold', color: stat.color }}>{stat.val}</div>
                            </div>
                        ))}
                    </div>

                    {/* At-Risk Students Focus (Priority) */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', border: '2px solid rgba(239, 68, 68, 0.1)', borderRadius: '24px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <AlertTriangle size={22} color="#ef4444" />
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>High-Risk Identification (AI Predictor)</h3>
                            </div>
                        </div>

                        {analytics.at_risk_students.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                                {analytics.at_risk_students.map((student, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '1.2rem', borderRadius: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '50%' }}><UserCircle size={28} color="#94a3b8" /></div>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{student.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '600' }}>{student.risk}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => { setFeedbackTarget(student); setFeedbackSubject(`Intervention: ${student.name}`); setShowFeedbackModal(true); }} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.75rem' }}>
                                            Intervene
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '20px', border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                                <CheckCircle size={32} color="#10b981" style={{ marginBottom: '1rem' }} />
                                <div style={{ fontWeight: 'bold', color: '#10b981' }}>No students currently identified as high risk.</div>
                             </div>
                        )}
                    </div>

                    {/* Visual Analytics */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.3)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '2.5rem 2rem' }}>
                        <h3 style={{ fontSize: '1.2rem', margin: '0 0 2rem 0', fontWeight: 'bold' }}>Engagement Distribution by Module</h3>
                        <div style={{ height: '280px' }}>
                            {analytics.module_rates.length > 0 ? (
                                <Bar data={chartData} options={chartOptions} />
                            ) : (
                                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Awaiting module data synchronization...</div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

             {/* Feedback Modal */}
             {showFeedbackModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: '#1e293b', width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem' }}>{feedbackTarget ? `Message to ${feedbackTarget.name}` : 'Report to Administration'}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>Subject</label>
                                <input value={feedbackSubject} onChange={e => setFeedbackSubject(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>Message Content</label>
                                <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} rows={5} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', resize: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button onClick={() => { setShowFeedbackModal(false); setFeedbackTarget(null); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleSendFeedback} style={{ flex: 2, padding: '12px', borderRadius: '12px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                    <Send size={18} /> Send Communication
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
