import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    QrCode, Activity, BookOpen, Users, Database, Settings, LogOut, Search, Plus, MoreVertical, ShieldCheck, Trash2, X 
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title as ChartTitle, Tooltip, Legend, ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import api from '../lib/api';
import useViewport from '../hooks/useViewport';

// Register Chart JS components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Legend, ArcElement
);

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { isMobile, isTablet } = useViewport();
    const isCompact = isTablet;
    const token = localStorage.getItem('token');

    const [activeTab, setActiveTab] = useState('overview');
    const [usersList, setUsersList] = useState([]);
    const [programmesList, setProgrammesList] = useState([]);
    const [settingsList, setSettingsList] = useState([]);

    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [isAddProgModalOpen, setIsAddProgModalOpen] = useState(false);

    const [newUserRole, setNewUserRole] = useState('student');
    const [newUserForm, setNewUserForm] = useState({ identifier: '', fullName: '', password: '' });
    const [newProgForm, setNewProgForm] = useState({ name: '', levels: '' });
    const [settingsForm, setSettingsForm] = useState({});

    // --- New Academic Setup States ---
    const [coursesList, setCoursesList] = useState([]);
    const [academicSubTab, setAcademicSubTab] = useState('programmes');
    const [newCourseForm, setNewCourseForm] = useState({
        code: '', name: '', programme_id: '', level: '', lecturer_id: '',
        day_of_week: '', time_slot: '', start_date: '', end_date: ''
    });
    const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState('');
    const [enrolledStudentIds, setEnrolledStudentIds] = useState([]);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchAll = async () => {
            try {
                // Using Promise.all to fetch all data simultaneously
                const [uRes, pRes, sRes, cRes] = await Promise.all([
                    api.get('/users/', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/admin/programmes', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/admin/settings', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/admin/courses', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setUsersList(uRes.data);
                setProgrammesList(pRes.data);
                setSettingsList(sRes.data);
                setCoursesList(cRes.data);

                const sObj = {};
                sRes.data.forEach(s => { sObj[s.key] = s.value; });
                // Provide some default keys if not present
                if (!sObj['institution_name']) sObj['institution_name'] = 'Demo University';
                if (!sObj['academic_year']) sObj['academic_year'] = '2025/2026';
                if (!sObj['ml_proxy_detection']) sObj['ml_proxy_detection'] = 'false';

                setSettingsForm(sObj);
            } catch (err) {
                console.error("Failed to fetch data:", err);
            }
        };

        fetchAll();
    }, [token, navigate]);

    // Handle User creation
    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                role: newUserRole,
                password: newUserForm.password,
                full_name: newUserForm.fullName
            };
            if (newUserRole === 'student') payload.student_reg_number = newUserForm.identifier;
            else if (newUserRole === 'lecturer') payload.lecturer_id = newUserForm.identifier;
            else payload.email = newUserForm.identifier;

            await api.post('/users/', payload, { headers: { Authorization: `Bearer ${token}` } });
            setIsAddUserModalOpen(false);
            setNewUserForm({ identifier: '', fullName: '', password: '' });
            
            const uRes = await api.get('/users/', { headers: { Authorization: `Bearer ${token}` } });
            setUsersList(uRes.data);
        } catch (err) {
            alert(err.response?.data?.detail || "Error adding user");
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setUsersList(usersList.filter(u => u.id !== id));
        } catch (err) {
            alert(err.response?.data?.detail || "Error deleting user");
        }
    };

    // Handle Programme creation
    const handleAddProgramme = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/programmes', newProgForm, { headers: { Authorization: `Bearer ${token}` } });
            setIsAddProgModalOpen(false);
            setNewProgForm({ name: '', levels: '' });
            
            const pRes = await api.get('/admin/programmes', { headers: { Authorization: `Bearer ${token}` } });
            setProgrammesList(pRes.data);
        } catch (err) {
            alert(err.response?.data?.detail || "Error adding programme");
        }
    };

    const handleDeleteProgramme = async (id) => {
        if (!window.confirm("Are you sure you want to delete this programme?")) return;
        try {
            await api.delete(`/admin/programmes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setProgrammesList(programmesList.filter(p => p.id !== id));
        } catch (err) {
            alert("Error deleting programme");
        }
    };

    // --- Course / Module Handlers ---
    const handleAddCourse = async (e) => {
        e.preventDefault();
        try {
            await api.post('/admin/courses', newCourseForm, { headers: { Authorization: `Bearer ${token}` } });
            setNewCourseForm({ code: '', name: '', programme_id: '', level: '', lecturer_id: '', day_of_week: '', time_slot: '', start_date: '', end_date: '' });
            alert("Module added successfully");
            
            const cRes = await api.get('/admin/courses', { headers: { Authorization: `Bearer ${token}` } });
            setCoursesList(cRes.data);
        } catch (err) {
            alert(err.response?.data?.detail || "Error adding course");
        }
    };

    const handleDeleteCourse = async (id) => {
        if (!window.confirm("Are you sure you want to delete this module?")) return;
        try {
            await api.delete(`/admin/courses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setCoursesList(coursesList.filter(c => c.id !== id));
        } catch (err) {
            alert("Error deleting course");
        }
    };

    // --- Enrollment Handlers ---
    const handleFetchEnrollments = async (courseId) => {
        setSelectedCourseForEnrollment(courseId);
        try {
            const res = await api.get(`/admin/enrollments/${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
            setEnrolledStudentIds(res.data.map(e => e.student_id));
        } catch (err) {
            alert("Error fetching enrollments");
        }
    };

    const handleSaveEnrollments = async () => {
        if (!selectedCourseForEnrollment) return;
        try {
            await api.post('/admin/enrollments', { course_id: selectedCourseForEnrollment, student_ids: enrolledStudentIds }, { headers: { Authorization: `Bearer ${token}` } });
            alert("Student enrollments saved!");
        } catch (err) {
            alert("Error saving enrollments");
        }
    };

    const toggleStudentSelection = (studentId) => {
        if (enrolledStudentIds.includes(studentId)) {
            setEnrolledStudentIds(enrolledStudentIds.filter(id => id !== studentId));
        } else {
            setEnrolledStudentIds([...enrolledStudentIds, studentId]);
        }
    };

    const handleSelectAllStudents = (filteredStudents) => {
        const filteredIds = filteredStudents.map(s => s.id);
        const allSelected = filteredIds.every(id => enrolledStudentIds.includes(id));
        if (allSelected) {
            setEnrolledStudentIds(enrolledStudentIds.filter(id => !filteredIds.includes(id)));
        } else {
            const newIds = new Set([...enrolledStudentIds, ...filteredIds]);
            setEnrolledStudentIds(Array.from(newIds));
        }
    };

    // Handle Settings Update
    const handleSaveSettings = async () => {
        try {
            const payload = Object.keys(settingsForm).map(k => ({ key: k, value: String(settingsForm[k]) }));
            await api.post('/admin/settings', payload, { headers: { Authorization: `Bearer ${token}` } });
            alert("Settings saved successfully.");
        } catch (err) {
            alert("Error saving settings");
        }
    };

    // Default mock data to match overview screens
    const lineChartData = {
        labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
        datasets: [
            {
                label: 'Scans',
                data: [120, 450, 300, 500, 200, 50],
                borderColor: '#3b82f6',
                backgroundColor: 'transparent',
                borderWidth: 3,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#3b82f6',
                pointRadius: 4,
            }
        ]
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false, drawBorder: false }, ticks: { color: '#64748b' } },
            y: { grid: { color: 'rgba(255, 255, 255, 0.05)', strokeDash: [5, 5] }, ticks: { color: '#64748b', stepSize: 150 }, min: 0, max: 600 }
        }
    };

    const studentsList = usersList.filter(u => u.role === 'student');
    const filteredStudentsList = studentsList.filter(s => {
        if (!studentSearchTerm) return true;
        const search = studentSearchTerm.toLowerCase();
        return (s.full_name || '').toLowerCase().includes(search) || 
               (s.student_reg_number || s.email || '').toLowerCase().includes(search);
    });

    const studentCount = studentsList.length || 85;
    const lecturerCount = usersList.filter(u => u.role === 'lecturer').length || 12;
    const adminCount = usersList.filter(u => u.role === 'admin' || u.role === 'super_admin').length || 3;

    const donutData = {
        labels: ['Students', 'Lecturers', 'Admins'],
        datasets: [
            {
                data: [studentCount, lecturerCount, adminCount],
                backgroundColor: ['#3b82f6', '#10b981', '#fbbf24'],
                borderWidth: 0,
                cutout: '75%',
            }
        ]
    };

    const donutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
    };

    const recentActivity = [
        { action: 'Session Started', user: 'Dr. Smith (LECT-1042)', details: 'CS201 - Level 2.1', time: '2 mins ago', accent: '#10b981' }
    ];

    const logout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const navItemStyle = (tabName) => ({
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
        background: activeTab === tabName ? '#2563eb' : 'transparent', 
        borderRadius: '12px', 
        color: activeTab === tabName ? '#fff' : '#94a3b8', 
        textDecoration: 'none', fontWeight: activeTab === tabName ? 600 : 500, 
        transition: 'all 0.2s', cursor: 'pointer'
    });

    return (
        <div style={{
            display: 'flex',
            flexDirection: isCompact ? 'column' : 'row',
            minHeight: '100vh',
            width: '100%',
            position: isCompact ? 'relative' : 'fixed',
            top: 0, left: 0,
            background: 'transparent',
            color: '#f8fafc',
            fontFamily: "'Outfit', sans-serif",
            overflow: isCompact ? 'auto' : 'hidden',
            zIndex: 100 // sit above the global background
        }}>
            {/* Sidebar */}
            <aside style={{
                width: isCompact ? '100%' : '260px',
                background: 'transparent',
                borderRight: isCompact ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                borderBottom: isCompact ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                padding: isCompact ? '1rem' : '1.5rem',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '3rem' }}>
                    <div style={{ background: '#2563eb', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <QrCode size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>SmartAttend Admin</span>
                </div>

                <nav style={{ display: 'flex', flexDirection: isCompact ? 'row' : 'column', flexWrap: 'wrap', gap: '0.5rem', flex: 1 }}>
                    <div onClick={() => setActiveTab('overview')} style={navItemStyle('overview')}>
                        <Activity size={20} /> System Overview
                    </div>
                    <div onClick={() => setActiveTab('academic')} style={navItemStyle('academic')}>
                        <BookOpen size={20} /> Academic Setup
                    </div>
                    <div onClick={() => setActiveTab('users')} style={navItemStyle('users')}>
                        <Users size={20} /> User Management
                    </div>
                    <div onClick={() => setActiveTab('integrity')} style={navItemStyle('integrity')}>
                        <Database size={20} /> Data Integrity
                    </div>
                    <div onClick={() => setActiveTab('settings')} style={navItemStyle('settings')}>
                        <Settings size={20} /> System Settings
                    </div>
                </nav>

                {/* Profile Widget */}
                <div style={{
                    background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: isCompact ? '1rem' : 'auto'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck size={24} color="#10b981" />
                        <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Super Admin</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                                admin@smartatten...
                            </div>
                        </div>
                    </div>
                    <LogOut size={18} color="#64748b" style={{ cursor: 'pointer' }} onClick={logout} />
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ flex: 1, padding: isCompact ? '1rem' : '2rem 3rem', overflowY: 'auto', background: 'transparent' }}>
                
                {/* Header changes based on tab */}
                {activeTab === 'overview' && (
                    <>
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', marginBottom: '2.5rem' }}>
                            <div>
                                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>System Overview</h1>
                                <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Monitor system health and activity.</p>
                            </div>
                        </header>

                        {/* Top Metrics Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem' }}>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Total Users</p>
                                <h2 style={{ color: '#60a5fa', fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>{usersList.length || 4660}</h2>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>Total Registered</p>
                            </div>
                            
                            <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem' }}>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Active Sessions</p>
                                <h2 style={{ color: '#10b981', fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>24</h2>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>Live</p>
                            </div>

                            <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem' }}>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>Total Scans (Today)</p>
                                <h2 style={{ color: '#c084fc', fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>1,240</h2>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>+15% vs yesterday</p>
                            </div>

                            <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem' }}>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>System Uptime</p>
                                <h2 style={{ color: '#f8fafc', fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>99.9%</h2>
                                <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>All systems operational</p>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>System Activity (QR Scans)</h3>
                                <div style={{ flex: 1, minHeight: '250px' }}>
                                    <Line data={lineChartData} options={lineChartOptions} />
                                </div>
                            </div>

                            <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1.5rem 0' }}>User Distribution</h3>
                                <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
                                    <div style={{ width: '180px', height: '180px' }}>
                                        <Doughnut data={donutData} options={donutOptions} />
                                    </div>
                                </div>
                                {/* Custom Legend */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        <span style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%' }}></span> Students
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></span> Lecturers
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        <span style={{ width: '10px', height: '10px', background: '#fbbf24', borderRadius: '50%' }}></span> Admins
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Table */}
                        <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflowX: 'auto' }}>
                            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Recent System Activity</h3>
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'rgba(11, 17, 32, 0.5)', fontSize: '0.8rem', color: '#64748b' }}>
                                    <tr>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>ACTION</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>USER</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>DETAILS</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>TIME</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentActivity.map((activity, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ display: 'inline-flex', padding: '4px 8px', borderRadius: '6px', background: `rgba(16, 185, 129, 0.1)`, color: activity.accent, fontSize: '0.85rem', fontWeight: 500 }}>
                                                    {activity.action}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontSize: '0.95rem', fontWeight: 500 }}>{activity.user}</td>
                                            <td style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>{activity.details}</td>
                                            <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.9rem' }}>{activity.time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'users' && (
                    <>
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', marginBottom: '2.5rem' }}>
                            <div>
                                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>User Management</h1>
                                <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Manage all system users.</p>
                            </div>
                            <button onClick={() => setIsAddUserModalOpen(true)} style={{
                                background: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer'
                            }}>
                                <Plus size={18} /> Add User
                            </button>
                        </header>
                        
                        <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'rgba(11, 17, 32, 0.5)', fontSize: '0.8rem', color: '#64748b' }}>
                                    <tr>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>ID</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>ROLE</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>NAME</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>IDENTIFIER (Email/Reg/LectID)</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {usersList.map((u) => (
                                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '1rem 1.5rem', color: '#94a3b8' }}>{u.id}</td>
                                            <td style={{ padding: '1rem 1.5rem', textTransform: 'capitalize' }}>
                                                <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '0.85rem' }}>
                                                    {u.role}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{u.full_name || 'N/A'}</td>
                                            <td style={{ padding: '1rem 1.5rem', color: '#94a3b8' }}>{u.email || u.student_reg_number || u.lecturer_id}</td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <button onClick={() => handleDeleteUser(u.id)} disabled={u.role === 'super_admin'} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: u.role === 'super_admin' ? 'not-allowed' : 'pointer', opacity: u.role === 'super_admin' ? 0.5 : 1 }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'academic' && (
                    <>
                        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                            <div>
                                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Academic Setup</h1>
                                <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Configure programmes, modules, and enrollments.</p>
                            </div>
                        </header>

                        {/* Sub-Tabs Navigation */}
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                            {['programmes', 'modules', 'enrollment'].map((tab) => (
                                <button key={tab} onClick={() => setAcademicSubTab(tab)} style={{
                                    background: academicSubTab === tab ? '#2563eb' : 'transparent',
                                    color: academicSubTab === tab ? '#fff' : '#94a3b8',
                                    border: 'none', padding: '8px 16px', borderRadius: '20px',
                                    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize'
                                }}>
                                    {tab === 'programmes' ? 'Programmes & Levels' : tab === 'modules' ? 'Modules & Lecturers' : 'Student Enrollment'}
                                </button>
                            ))}
                        </div>

                        {/* Sub-Tab: Programmes */}
                        {academicSubTab === 'programmes' && (
                            <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 2fr', gap: '2rem' }}>
                                {/* Left: Form */}
                                <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', height: 'fit-content' }}>
                                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', marginTop: 0 }}>Create Programme</h2>
                                    <form onSubmit={handleAddProgramme} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Programme Name (e.g. Computer Science)</label>
                                            <input type="text" required value={newProgForm.name} onChange={(e) => setNewProgForm({...newProgForm, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Levels (Comma separated, e.g. L1,L2,L3)</label>
                                            <input type="text" required value={newProgForm.levels} onChange={(e) => setNewProgForm({...newProgForm, levels: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                                        </div>
                                        <button type="submit" style={{ marginTop: '1rem', background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                            Save Programme
                                        </button>
                                    </form>
                                </div>
                                {/* Right: List */}
                                <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
                                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>Mapped Programmes</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ background: 'rgba(11, 17, 32, 0.5)', fontSize: '0.8rem', color: '#64748b' }}>
                                            <tr>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>PROGRAMME NAME</th>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>LEVELS</th>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {programmesList.map((p) => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: '#f8fafc' }}>{p.name}</td>
                                                    <td style={{ padding: '1rem 1.5rem', color: '#94a3b8' }}>{p.levels}</td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <button onClick={() => handleDeleteProgramme(p.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {programmesList.length === 0 && <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No programmes mapped yet.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Sub-Tab: Modules */}
                        {academicSubTab === 'modules' && (
                            <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 2fr', gap: '2rem' }}>
                                {/* Left: Form */}
                                <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', height: 'fit-content' }}>
                                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', marginTop: 0 }}>Create Module</h2>
                                    <form onSubmit={handleAddCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Module Code</label>
                                                <input type="text" required value={newCourseForm.code} onChange={(e) => setNewCourseForm({...newCourseForm, code: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Module Name</label>
                                                <input type="text" required value={newCourseForm.name} onChange={(e) => setNewCourseForm({...newCourseForm, name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Programme</label>
                                            <select required value={newCourseForm.programme_id} onChange={(e) => setNewCourseForm({...newCourseForm, programme_id: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                                                <option value="">Select Programme...</option>
                                                {programmesList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Level</label>
                                            <select required value={newCourseForm.level} onChange={(e) => setNewCourseForm({...newCourseForm, level: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                                                <option value="">Select Level...</option>
                                                {newCourseForm.programme_id ? programmesList.find(p => p.id == newCourseForm.programme_id)?.levels.split(',').map(l => <option key={l} value={l.trim()}>{l.trim()}</option>) : null}
                                            </select>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Assign Lecturer</label>
                                            <select required value={newCourseForm.lecturer_id} onChange={(e) => setNewCourseForm({...newCourseForm, lecturer_id: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                                                <option value="">Select Lecturer...</option>
                                                {usersList.filter(u => u.role === 'lecturer').map(l => <option key={l.id} value={l.id}>{l.full_name || l.lecturer_id}</option>)}
                                            </select>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Day of Week</label>
                                                <select value={newCourseForm.day_of_week} onChange={(e) => setNewCourseForm({...newCourseForm, day_of_week: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                                                    <option value="">Select...</option>
                                                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Time Slot (e.g. 09:00 - 11:00)</label>
                                                <input type="text" value={newCourseForm.time_slot} onChange={(e) => setNewCourseForm({...newCourseForm, time_slot: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>Start Date</label>
                                                <input type="date" value={newCourseForm.start_date} onChange={(e) => setNewCourseForm({...newCourseForm, start_date: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>End Date</label>
                                                <input type="date" value={newCourseForm.end_date} onChange={(e) => setNewCourseForm({...newCourseForm, end_date: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                                            </div>
                                        </div>

                                        <button type="submit" style={{ marginTop: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                            Add Module
                                        </button>
                                    </form>
                                </div>
                                {/* Right: List */}
                                <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
                                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>Mapped Modules</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ background: 'rgba(11, 17, 32, 0.5)', fontSize: '0.8rem', color: '#64748b' }}>
                                            <tr>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>CODE & NAME</th>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>SCHEDULE</th>
                                                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {coursesList.map((c) => (
                                                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{c.code}</div>
                                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{c.name} ({c.level})</div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                        {c.day_of_week} {c.time_slot}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <button onClick={() => handleDeleteCourse(c.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {coursesList.length === 0 && <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No modules mapped yet.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Sub-Tab: Enrollment */}
                        {academicSubTab === 'enrollment' && (
                            <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : '1fr 2fr', gap: '2rem' }}>
                                {/* Left: Selector */}
                                <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', height: 'fit-content' }}>
                                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', marginTop: 0 }}>Target Module</h2>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Select Module to Map Students</label>
                                        <select value={selectedCourseForEnrollment} onChange={(e) => handleFetchEnrollments(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                                            <option value="">Choose...</option>
                                            {coursesList.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                                        </select>
                                    </div>
                                    
                                    {selectedCourseForEnrollment && (
                                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Currently Enrolled</div>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#60a5fa' }}>{enrolledStudentIds.length} <span style={{fontSize:'1rem', fontWeight:400}}>students</span></div>
                                        </div>
                                    )}

                                    <button onClick={handleSaveEnrollments} disabled={!selectedCourseForEnrollment} style={{ marginTop: '2rem', width: '100%', background: selectedCourseForEnrollment ? '#2563eb' : '#334155', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: selectedCourseForEnrollment ? 'pointer' : 'not-allowed', opacity: selectedCourseForEnrollment ? 1 : 0.5 }}>
                                        Save Enrollments ({enrolledStudentIds.length})
                                    </button>
                                </div>
                                {/* Right: Student Selection */}
                                <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: isCompact ? 'auto' : '600px', minHeight: isCompact ? '420px' : 'unset' }}>
                                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
                                        <div style={{ fontWeight: 600 }}>Select Students</div>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <div style={{ position: 'relative' }}>
                                                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                                                <input type="text" placeholder="Search students..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} style={{ padding: '8px 8px 8px 32px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem', width: isMobile ? '100%' : '200px', minWidth: isMobile ? '220px' : 'unset' }} />
                                            </div>
                                            {(() => {
                                                const allSelected = filteredStudentsList.length > 0 && filteredStudentsList.every(s => enrolledStudentIds.includes(s.id));
                                                return (
                                                    <button onClick={() => handleSelectAllStudents(filteredStudentsList)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                                                        {allSelected ? 'Deselect All' : 'Select All'}
                                                    </button>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                                        {filteredStudentsList.map((s) => (
                                            <div key={s.id} onClick={() => toggleStudentSelection(s.id)} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px', background: enrolledStudentIds.includes(s.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent', border: enrolledStudentIds.includes(s.id) ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.5rem', transition: 'all 0.1s' }}>
                                                <input type="checkbox" checked={enrolledStudentIds.includes(s.id)} readOnly style={{ cursor: 'pointer' }} />
                                                <div>
                                                    <div style={{ fontWeight: 600, color: enrolledStudentIds.includes(s.id) ? '#60a5fa' : '#f8fafc' }}>{s.full_name || 'No Name'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.student_reg_number || s.email}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredStudentsList.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No students match your search.</div>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'settings' && (
                    <>
                        <header style={{ marginBottom: '2.5rem' }}>
                            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>System Settings</h1>
                            <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0' }}>Configure global parameters and themes.</p>
                        </header>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'minmax(400px, 600px)', gap: '2rem' }}>
                            <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Institution Name</label>
                                        <input 
                                            type="text" 
                                            value={settingsForm['institution_name'] || ''}
                                            onChange={(e) => setSettingsForm({...settingsForm, institution_name: e.target.value})}
                                            style={{ width: '100%', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '8px', color: '#fff', outline: 'none' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Academic Year</label>
                                        <input 
                                            type="text" 
                                            value={settingsForm['academic_year'] || ''}
                                            onChange={(e) => setSettingsForm({...settingsForm, academic_year: e.target.value})}
                                            style={{ width: '100%', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '8px', color: '#fff', outline: 'none' }} 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>ML Proxy Detection Flag</label>
                                        <select 
                                            value={settingsForm['ml_proxy_detection'] || 'false'}
                                            onChange={(e) => setSettingsForm({...settingsForm, ml_proxy_detection: e.target.value})}
                                            style={{ width: '100%', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '8px', color: '#fff', outline: 'none' }}
                                        >
                                            <option value="true">Enabled</option>
                                            <option value="false">Disabled</option>
                                        </select>
                                    </div>
                                    
                                    <button onClick={handleSaveSettings} style={{
                                        marginTop: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                                    }}>
                                        Save Configuration Settings
                                    </button>
                                </div>
                            </div>

                            <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '2rem' }}>
                                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>Global Default Background</h3>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                                    Overwrite the master background image explicitly across the entire institution platform. 
                                    (This overrides any dynamically missing server bg.jpg file instantly).
                                </p>
                                
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>Select Master File (.png, .jpg)</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if(!file) return;
                                        
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        
                                        try {
                                            await api.post('/admin/upload-bg', formData, {
                                                headers: { 
                                                    'Authorization': `Bearer ${token}`,
                                                    'Content-Type': 'multipart/form-data'
                                                }
                                            });
                                            alert("Master background firmly overwritten! All pages will update securely.");
                                            // Force reload the background to reflect changes for the admin immediately
                                            const ts = new Date().getTime();
                                            document.body.style.backgroundImage = `url('/bg.jpg?${ts}')`;
                                        } catch (err) {
                                            alert("Failed to upload default background.");
                                        }
                                    }}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px dashed rgba(59, 130, 246, 0.5)', color: '#60a5fa', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'integrity' && (
                    <div style={{ textAlign: 'center', paddingTop: '4rem', color: '#64748b' }}>
                        <Database size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h2>Data Integrity Center</h2>
                        <p>Detailed logs and audit features will be enabled here.</p>
                    </div>
                )}

            </main>

            {/* Modal: Add User */}
            {isAddUserModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
                    <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Add New User</h2>
                            <X size={20} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setIsAddUserModalOpen(false)} />
                        </div>
                        <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Role</label>
                                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                                    <option value="student">Student</option>
                                    <option value="lecturer">Lecturer</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Identifier (Email / Reg No / Lect ID)</label>
                                <input type="text" required value={newUserForm.identifier} onChange={(e) => setNewUserForm({...newUserForm, identifier: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Full Name</label>
                                <input type="text" value={newUserForm.fullName} onChange={(e) => setNewUserForm({...newUserForm, fullName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Initial Password</label>
                                <input type="password" required value={newUserForm.password} onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                            </div>
                            <button type="submit" style={{ marginTop: '1rem', background: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                Add User
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Programme */}
            {isAddProgModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
                    <div style={{ background: 'rgba(17, 24, 39, 0.4)', backdropFilter: 'blur(4px)', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Add Programme</h2>
                            <X size={20} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setIsAddProgModalOpen(false)} />
                        </div>
                        <form onSubmit={handleAddProgramme} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Programme Name (e.g., Computer Science)</label>
                                <input type="text" required value={newProgForm.name} onChange={(e) => setNewProgForm({...newProgForm, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>Levels (Comma separated, e.g., L1,L2,L3)</label>
                                <input type="text" required value={newProgForm.levels} onChange={(e) => setNewProgForm({...newProgForm, levels: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(11, 17, 32, 0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                            </div>
                            <button type="submit" style={{ marginTop: '1rem', background: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                Save Programme
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
