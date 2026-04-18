import React, { useState, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import { LogOut, QrCode, UserCircle, AlertTriangle, TrendingUp, BookOpen } from 'lucide-react';
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

    useEffect(() => {
        if (!token || !userId) {
            navigate('/login');
            return;
        }

        const fetchStudentData = async () => {
            try {
                const res = await api.get(`/analytics/student_dashboard/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` } 
                });
                setAnalytics(res.data);
            } catch (err) {
                console.error("Failed to load student data", err);
            }
        };

        fetchStudentData();
        const interval = setInterval(fetchStudentData, 5000);
        return () => clearInterval(interval);
    }, [token, userId, navigate]);

    const handleScan = async (data) => {
        if (data) {
            try {
                const payload = JSON.parse(data.text || data);
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

    // Helper functions for dynamic styles
    const getRiskColor = (risk) => {
        if (risk.includes("High")) return "#ef4444";
        if (risk.includes("Medium")) return "#f59e0b";
        return "#10b981";
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
                padding: isCompact ? '1rem 1.25rem' : '1.2rem 3rem', background: 'rgba(11, 17, 32, 0.35)',
                backdropFilter: 'blur(4px)', borderBottom: '1px solid rgba(255,255,255,0.05)',
                position: 'sticky', top: 0, zIndex: 110
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#2563eb', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                        <QrCode size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>SmartAttend</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '100%' }}>
                        <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{studentIdentifier}</span>
                    </div>
                    <LogOut size={20} color="#94a3b8" style={{ cursor: 'pointer', transition: 'color 0.2s' }} onClick={logout} onMouseOver={(e) => e.target.style.color='#ef4444'} onMouseOut={(e) => e.target.style.color='#94a3b8'} />
                </div>
            </header>

            {/* Main Layout Grid */}
            <main style={{ padding: isCompact ? '1rem' : '2rem 3rem', flex: 1, display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'minmax(350px, 400px) 1fr', gap: '2rem' }}>
                
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Profile Panel */}
                    <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '1.5rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <UserCircle size={48} color="#94a3b8" />
                        </div>
                        <div>
                            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.6rem', fontWeight: 'bold' }}>{studentName}</h2>
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '1rem', marginBottom: '0.8rem' }}>{analytics.programme}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem' }}>{analytics.level}</span>
                                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem' }}>Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Camera / Scanner / Action Panel */}
                    <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2.5rem 2rem', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', background: 'rgba(46, 204, 113, 0.1)', padding: '1.2rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
                            <QrCode size={40} color="#3b82f6" />
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 'bold' }}>Record Attendance</h3>
                        <p style={{ margin: '0 0 2rem 0', color: '#94a3b8', fontSize: '0.95rem' }}>Scan the secure token for your current class.</p>

                        {!isScanning ? (
                             <button onClick={() => setIsScanning(true)} style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>
                                 Launch Scanner
                             </button>
                        ) : (
                             <div style={{ background: '#000', borderRadius: '8px', overflow: 'hidden', padding: '4px' }}>
                                 <QrReader
                                     onResult={(result) => handleScan(result)}
                                     constraints={{ facingMode: 'environment' }}
                                     style={{ width: '100%' }}
                                 />
                                 <button onClick={() => setIsScanning(false)} style={{ width: '100%', padding: '10px', background: '#ef4444', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px' }}>
                                     Cancel
                                 </button>
                             </div>
                        )}
                    </div>

                    {/* ML Insights Panel */}
                    <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                            <TrendingUp size={20} color="#c084fc" />
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>ML Insights</h3>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Risk Classification</span>
                                    <span style={{ color: getRiskColor(analytics.ml_insights.risk_classification), border: `1px solid ${getRiskColor(analytics.ml_insights.risk_classification)}30`, background: `${getRiskColor(analytics.ml_insights.risk_classification)}15`, padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertTriangle size={14} /> {analytics.ml_insights.risk_classification}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#cbd5e1' }}>{analytics.ml_insights.description}</p>
                            </div>

                            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '0.5rem', marginBottom: '0.8rem' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Predicted Trajectory</span>
                                    <span style={{ color: getRiskColor(analytics.ml_insights.trajectory), border: `1px solid ${getRiskColor(analytics.ml_insights.trajectory)}30`, background: `${getRiskColor(analytics.ml_insights.trajectory)}15`, padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <TrendingUp size={14} /> {analytics.ml_insights.trajectory}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#cbd5e1' }}>{analytics.ml_insights.trajectory_description}</p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Top 4 Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }}>
                        <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>Overall Rate</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#3b82f6' }}>{analytics.overall_rate}%</span>
                                <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>-2%</span>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>Classes Attended</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#10b981' }}>{analytics.classes_attended}</span>
                                <span style={{ fontSize: '0.85rem', color: '#10b981' }}>+4</span>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>Classes Missed</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#ef4444' }}>{analytics.classes_missed}</span>
                                <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>+1</span>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Modules</span>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Active</span>
                            </div>
                            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#c084fc' }}>{analytics.modules_count}</div>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.2rem', margin: '0 0 2rem 0', fontWeight: 'bold' }}>Weekly Attendance Trend</h3>
                        <div style={{ height: '280px', position: 'relative' }}>
                            <Line data={chartData} options={chartOptions} />
                        </div>
                    </div>

                    {/* Enrolled Modules Progress Bars */}
                    <div style={{ background: 'rgba(17, 24, 39, 0.25)', backdropFilter: 'blur(4px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '0.75rem', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Enrolled Modules</h3>
                            <span style={{ color: '#3b82f6', fontSize: '0.9rem', cursor: 'pointer' }}>View All</span>
                        </div>

                        {analytics.enrolled_modules.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {analytics.enrolled_modules.map((m, idx) => (
                                    <div key={idx} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px', gap: isMobile ? '1rem' : 0 }}>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginRight: '1.5rem' }}>
                                            <BookOpen size={20} color="#94a3b8" />
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '4px' }}>{m.code}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{m.name}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: isMobile ? '100%' : '250px' }}>
                                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${m.rate}%`, height: '100%', background: getProgressColor(m.rate), borderRadius: '4px' }}></div>
                                                </div>
                                                <span style={{ color: getProgressColor(m.rate), fontWeight: 'bold', width: '40px', textAlign: 'right' }}>{m.rate}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No modules mapped yet.</div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
