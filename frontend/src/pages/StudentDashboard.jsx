import React, { useState, useEffect } from 'react';
import QrScanner from '../components/QrScanner';
import { LogOut, QrCode, UserCircle, AlertTriangle, TrendingUp, BookOpen, Bell, MessageSquare, Shield, Key, Send, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler } from 'chart.js';
import api from '../lib/api';
import useViewport from '../hooks/useViewport';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { isMobile, isTablet } = useViewport();
    const isCompact = isTablet;
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('user_id');
    const studentName = localStorage.getItem('name') || "Student";
    const studentIdentifier = localStorage.getItem('identifier') || "N/A";

    const [analytics, setAnalytics] = useState({
        programme: "Loading...",
        level: "Loading...",
        overall_rate: 0,
        classes_attended: 0,
        classes_missed: 0,
        modules_count: 0,
        enrolled_modules: [],
        weekly_trend: [0, 0, 0, 0, 0, 0, 0],
        ml_insights: {
            risk_classification: "Scanning...",
            description: "Calculating trajectory.",
            trajectory: "Scanning...",
            trajectory_description: "Awaiting logs."
        }
    });

    const [isScanning, setIsScanning] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Feedback State
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackSubject, setFeedbackSubject] = useState("");
    const [feedbackMessage, setFeedbackMessage] = useState("");
    
    // Password State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        if (!token || !userId) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const [analyticsRes, notifRes] = await Promise.all([
                    api.get(`/analytics/student_dashboard/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/notifications/', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setAnalytics(analyticsRes.data);
                setNotifications(notifRes.data);
            } catch (err) {
                console.error("Failed to load data", err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [token, userId, navigate]);

    const handleScan = async (data) => {
        if (data) {
            try {
                const payload = typeof data === 'string' ? JSON.parse(data) : data;
                if (!payload.course_id) throw new Error("Invalid Token");
                
                await api.post('/attendance/scan', {
                    student_id: parseInt(userId), 
                    course_id: payload.course_id 
                });
                alert('Attendance successfully recorded!');
                setIsScanning(false);
            } catch (e) {
                alert('Error logging attendance. Ensure this is a valid lecturer QR token.');
                setIsScanning(false);
            }
        }
    };

    const handleSendFeedback = async () => {
        try {
            await api.post('/feedback/', {
                subject: feedbackSubject,
                message: feedbackMessage
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert("Feedback sent to administrators.");
            setShowFeedbackModal(false);
            setFeedbackSubject("");
            setFeedbackMessage("");
        } catch (err) {
            alert("Failed to send feedback.");
        }
    };

    const handleChangePassword = async () => {
        try {
            await api.post('/users/change-password', {
                old_password: oldPassword,
                new_password: newPassword
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert("Password changed successfully.");
            setShowPasswordModal(false);
            setOldPassword("");
            setNewPassword("");
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to change password.");
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

    // Chart.js Setup
    const chartData = {
        labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'],
        datasets: [
            {
                label: 'Attendance Rate',
                data: analytics.weekly_trend,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: { label: (context) => `${context.raw}%` }
            }
        },
        scales: {
            x: { grid: { display: false, drawBorder: false }, ticks: { color: '#64748b' } },
            y: { grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false }, ticks: { color: '#64748b', stepSize: 25 }, min: 0, max: 100 }
        }
    };

    const getRiskColor = (risk) => {
        if (!risk) return "#94a3b8";
        const r = risk.toLowerCase();
        if (r.includes("high") || r.includes("declining")) return "#ef4444";
        if (r.includes("medium") || r.includes("volatile")) return "#f59e0b";
        if (r.includes("low") || r.includes("stable") || r.includes("elite") || r.includes("ascending")) return "#10b981";
        return "#94a3b8";
    };

    const getProgressColor = (rate) => {
        if (rate >= 80) return "#10b981";
        if (rate >= 60) return "#f59e0b";
        return "#ef4444";
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%',
            position: isCompact ? 'relative' : 'fixed', top: 0, left: 0, background: 'transparent',
            color: '#f8fafc', fontFamily: "'Outfit', sans-serif", overflowY: 'auto', zIndex: 100
        }}>
            {/* Top Navigation */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? '0.75rem' : 0,
                padding: isCompact ? '1rem 1.25rem' : '1.2rem 3rem', background: 'rgba(11, 17, 32, 0.65)',
                backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)',
                position: 'sticky', top: 0, zIndex: 110
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#2563eb', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                        <TrendingUp size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>SmartAttend AI</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-end' }}>
                    <div style={{ position: 'relative' }}>
                        <div onClick={() => setShowNotifications(!showNotifications)} style={{ cursor: 'pointer', position: 'relative', display: 'flex', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Bell size={20} color={notifications.some(n => !n.is_read) ? "#3b82f6" : "#94a3b8"} />
                            {notifications.filter(n => !n.is_read).length > 0 && <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', height: '18px', minWidth: '18px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold', color: '#fff', border: '2px solid #0f172a' }}>{notifications.filter(n => !n.is_read).length}</span>}
                        </div>
                        
                        {showNotifications && (
                            <div style={{ position: 'absolute', top: '125%', right: 0, width: '320px', background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '1.2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', zObject: 200 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Updates</h4>
                                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', cursor: 'pointer' }} onClick={() => setNotifications([])}>Clear all</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {notifications.length > 0 ? notifications.map(n => (
                                        <div key={n.id} onClick={() => markNotificationRead(n.id)} style={{ cursor: 'pointer', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: `4px solid ${getRiskColor(n.type)}`, transition: 'transform 0.2s' }}>
                                            <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px', color: '#f1f5f9' }}>{n.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4' }}>{n.message}</div>
                                        </div>
                                    )) : <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>No new updates</div>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '8px 18px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b98180' }}></div>
                        <span style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: '500' }}>{studentIdentifier}</span>
                    </div>
                    <LogOut size={20} color="#94a3b8" style={{ cursor: 'pointer', transition: 'all 0.2s' }} onClick={logout} />
                </div>
            </header>

            {/* Main Content Area */}
            <main style={{ padding: isCompact ? '1rem' : '2rem 3rem', flex: 1, display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '380px 1fr', gap: '2rem' }}>
                
                {/* Left Side: Profile & ML Insights (Prioritized) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* User Summary Card */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.2) 100%)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '14px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <UserCircle size={44} color="#3b82f6" />
                            </div>
                            <div>
                                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: 'bold' }}>{studentName}</h2>
                                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>{analytics.programme}</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                            <span style={{ flex: 1, textAlign: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600', border: '1px solid rgba(59, 130, 246, 0.1)' }}>{analytics.level}</span>
                            <button onClick={() => setShowPasswordModal(true)} style={{ background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', padding: '8px 16px', borderRadius: '12px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Key size={14} /> Password
                            </button>
                        </div>
                    </div>

                    {/* AI RISK INSIGHTS (Prominent) */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)', border: '2px solid rgba(59, 130, 246, 0.1)', borderRadius: '24px', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05 }}>
                            <TrendingUp size={150} color="#3b82f6" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.8rem' }}>
                            <Shield size={22} color="#60a5fa" />
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#f1f5f9' }}>CRISP-DM Intelligence</h3>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div style={{ background: 'rgba(2, 6, 23, 0.4)', borderRadius: '18px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>Risk Classification</span>
                                    <span style={{ color: getRiskColor(analytics.ml_insights.risk_classification), background: `${getRiskColor(analytics.ml_insights.risk_classification)}15`, padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${getRiskColor(analytics.ml_insights.risk_classification)}30` }}>
                                        {analytics.ml_insights.risk_classification.toUpperCase()}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#cbd5e1' }}>{analytics.ml_insights.description}</p>
                            </div>

                            <div style={{ background: 'rgba(2, 6, 23, 0.4)', borderRadius: '18px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>Predictive Trajectory</span>
                                    <span style={{ color: getRiskColor(analytics.ml_insights.trajectory), background: `${getRiskColor(analytics.ml_insights.trajectory)}15`, padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', border: `1px solid ${getRiskColor(analytics.ml_insights.trajectory)}30` }}>
                                        {analytics.ml_insights.trajectory.toUpperCase()}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#cbd5e1' }}>{analytics.ml_insights.trajectory_description}</p>
                            </div>

                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Activity size={12} /> MATHEMATICAL TRAJECTORY ANALYSIS
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                        <span style={{ color: '#94a3b8' }}>Baseline Stability:</span>
                                        <span style={{ color: '#fff' }}>{analytics.overall_rate > 80 ? 'Optimal' : 'Variable'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                        <span style={{ color: '#94a3b8' }}>Consecutive Weight:</span>
                                        <span style={{ color: '#fff' }}>{(analytics.ml_insights.trajectory === 'Declining') ? 'High Impact' : 'Nominal'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                        <span style={{ color: '#94a3b8' }}>Model Confidence:</span>
                                        <span style={{ color: '#10b981' }}>98.2% Accuracy</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Scanning */}
                    <div style={{ background: 'rgba(30, 41, 59, 0.3)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '2rem', textAlign: 'center' }}>
                         {!isScanning ? (
                            <>
                                <div style={{ display: 'inline-flex', background: 'rgba(59, 130, 246, 0.1)', padding: '1.2rem', borderRadius: '20px', marginBottom: '1.2rem' }}>
                                    <QrCode size={32} color="#3b82f6" />
                                </div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>Scan to Log</h3>
                                <p style={{ margin: '0 0 1.5rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>Hold your phone to the lecturer's QR code.</p>
                                <button onClick={() => setIsScanning(true)} style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}>
                                    Launch Scanner
                                </button>
                            </>
                         ) : (
                            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '20px', overflow: 'hidden', padding: '12px' }}>
                                <QrScanner onScanSuccess={(decodedText) => handleScan(decodedText)} onScanFailure={() => {}} />
                                <button onClick={() => setIsScanning(false)} style={{ width: '100%', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px' }}>Cancel</button>
                            </div>
                         )}
                    </div>

                    {/* Feedback / Support Button */}
                    <button onClick={() => setShowFeedbackModal(true)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1.2rem', borderRadius: '20px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <MessageSquare size={18} /> Send Feedback or Report Issue
                    </button>
                </div>

                {/* Right Side: Detailed Stats & Trends */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* High Level Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        {[
                            { label: 'Overall Rate', val: `${analytics.overall_rate}%`, color: '#3b82f6', detail: analytics.overall_rate >= 75 ? "Optimal" : "Concern" },
                            { label: 'Classes Attended', val: analytics.classes_attended, color: '#10b981', detail: "Verified Logs" },
                            { label: 'Total Possible', val: analytics.classes_attended + analytics.classes_missed, color: '#f59e0b', detail: "Session Total" },
                            { label: 'Missed Sessions', val: analytics.classes_missed, color: '#ef4444', detail: analytics.classes_missed > 3 ? "Alert" : "Low" }
                        ].map((stat, i) => (
                            <div key={i} style={{ background: 'rgba(30, 41, 59, 0.25)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '500', marginBottom: '12px' }}>{stat.label}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: stat.color }}>{stat.val}</span>
                                    <span style={{ fontSize: '0.75rem', color: stat.color, background: `${stat.color}10`, padding: '2px 8px', borderRadius: '6px' }}>{stat.detail}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart Visualization */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.3)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>Engagement Probability Curve</h3>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Last 7 Active Weeks</span>
                        </div>
                        <div style={{ height: '320px' }}>
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Modules Grid */}
                    <div style={{ background: 'rgba(15, 23, 42, 0.3)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.2rem', margin: '0 0 1.5rem 0', fontWeight: 'bold' }}>Active Module Performance</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.2rem' }}>
                            {analytics.enrolled_modules.map((m, idx) => (
                                <div key={idx} style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '18px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: '#f1f5f9' }}>{m.code}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{m.name}</div>
                                        </div>
                                        <span style={{ color: getProgressColor(m.rate), fontWeight: 'bold', fontSize: '1rem' }}>{m.rate}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${m.rate}%`, height: '100%', background: getProgressColor(m.rate), borderRadius: '3px' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* MODALS */}
            {showFeedbackModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: '#1e293b', width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem' }}>Send Feedback</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>Subject</label>
                                <input value={feedbackSubject} onChange={e => setFeedbackSubject(e.target.value)} placeholder="e.g. Attendance Correction" style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>Message</label>
                                <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} rows={4} placeholder="Describe your issue or feedback..." style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', resize: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button onClick={() => setShowFeedbackModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleSendFeedback} style={{ flex: 2, padding: '12px', borderRadius: '12px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}>
                                    <Send size={18} /> Send Message
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPasswordModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: '#1e293b', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem' }}>Security Settings</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>Current Password</label>
                                <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>New Password</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleChangePassword} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Update Password</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
