import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import api from '../lib/api';
import useViewport from '../hooks/useViewport';

export default function Login() {
    // States for distinguishing forms
    const [isRegister, setIsRegister] = useState(false);
    const [isInitializingSuperAdmin, setIsInitializingSuperAdmin] = useState(false);
    
    // Form data
    const [loginRole, setLoginRole] = useState('student');
    const [formData, setFormData] = useState({ identifier: '', password: '', email: '', fullName: '' });
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { isMobile } = useViewport();

    // The backend `systemInitialized` status is now mostly a background check, 
    // but the actual init form is triggered manually via the 'admin' role.
    const [systemInitialized, setSystemInitialized] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await api.get('/auth/status');
                setSystemInitialized(res.data.is_initialized);
            } catch (e) {
                console.error("Failed to check status", e);
            }
        };
        checkStatus();
    }, []);

    const handleInit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/init', {
                email: formData.identifier,
                password: formData.password,
                full_name: formData.fullName
            });
            alert("Super Admin Initialized successfully! Please sign in with those credentials to continue.");
            setIsInitializingSuperAdmin(false);
            setSystemInitialized(true);
            setFormData({ ...formData, password: '' });
        } catch (error) {
            const detail = error.response?.data?.detail;
            if (Array.isArray(detail)) {
                alert("Validation Error: " + detail.map(d => d.msg).join(', '));
            } else {
                alert(detail || (error.message === 'Network Error' ? "Server Unreachable (it may have crashed or is restarting)." : "Initialization failed"));
            }
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Note: loginRole is purely for UI context and determining whether to show "Initialize System".
            // The backend login uses the identifier to match the right user.
            const res = await api.post('/auth/login', {
                identifier: formData.identifier,
                password: formData.password
            });
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem('role', res.data.role);
            localStorage.setItem('name', res.data.name);
            localStorage.setItem('user_id', res.data.id);
            localStorage.setItem('identifier', res.data.identifier);
            
            const dashboardRoute = res.data.role === 'super_admin' ? 'admin' : res.data.role;
            navigate(`/${dashboardRoute}`);
        } catch (err) {
            if (err.message === 'Network Error') {
                alert("Cannot connect to server. It is likely still starting up. Please wait to try again.");
                return;
            }
            alert(err.response?.data?.detail || "Login failed");
            
            // If the user's password is not set, they must register it
            if (err.response?.data?.detail?.includes("Password not set") || err.response?.data?.detail?.includes("register")) {
                setIsRegister(true);
            }
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', {
                role: loginRole, // use the currently selected role
                password: formData.password,
                identifier: formData.identifier,
                full_name: formData.fullName
            });
            alert("Details saved successfully! You can now log in.");
            setIsRegister(false);
            setFormData({ ...formData, password: '' }); // Require them to type it in again to login
        } catch (error) {
            alert(error.response?.data?.detail || "Configuration failed");
        }
    };

    const getFormTitle = () => {
        if (isInitializingSuperAdmin) return "Initialize Super Admin";
        if (isRegister) return "Setup Your Details";
        return "System Login";
    };

    const handleSubmit = (e) => {
        if (isInitializingSuperAdmin) return handleInit(e);
        if (isRegister) return handleRegister(e);
        return handleLogin(e);
    };

    return (
        <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', marginTop: isMobile ? 0 : '-50px', padding: isMobile ? '1rem' : undefined }}>
            <div className="glass-container animate-fade-in" style={{ width: '100%', maxWidth: '420px', position: 'relative', padding: isMobile ? '1.5rem' : '2rem' }}>
                
                {(isRegister || isInitializingSuperAdmin) && (
                    <button 
                        onClick={() => {
                            setIsRegister(false);
                            setIsInitializingSuperAdmin(false);
                        }} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', position: 'absolute', top: '15px', left: '15px', cursor: 'pointer' }}
                        title="Back to Login"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}

                <h2 style={{ textAlign: 'center', marginBottom: '2rem', background: 'linear-gradient(to right, #818cf8, #c084fc)', flexWrap: 'wrap', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {getFormTitle()}
                </h2>

                <form onSubmit={handleSubmit}>

                    {/* Show Role Selector only on basic Login or Register screens */}
                    {!isInitializingSuperAdmin && (
                        <div className="input-group animate-fade-in">
                            <label>Select Your Role</label>
                            <select 
                                className="input-field" 
                                value={loginRole} 
                                onChange={(e) => setLoginRole(e.target.value)}
                                disabled={isRegister} // locking the role if they are in the register flow
                            >
                                <option value="student">Student</option>
                                <option value="lecturer">Lecturer</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    )}

                    <div className="input-group">
                        <label>{isInitializingSuperAdmin ? "Email Address" : "Identifier (Email / Reg No / ID)"}</label>
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <User style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} size={20} />
                            <input
                                type={isInitializingSuperAdmin ? "email" : "text"}
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                value={formData.identifier}
                                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {(isRegister || isInitializingSuperAdmin) && (
                        <div className="input-group animate-fade-in">
                            <label>Full Name</label>
                            <input
                                type="text"
                                className="input-field"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <label>{isRegister ? "Create Password" : "Password"}</label>
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <Lock style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} size={20} />
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input-field"
                                style={{ paddingLeft: '40px', paddingRight: '40px' }}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <div 
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </div>
                        </div>
                    </div>

                    <button className="btn" type="submit" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>
                        {isInitializingSuperAdmin ? "Initialize System" : (isRegister ? "Save & Go To Login" : "Sign In & Continue")}
                    </button>

                    {/* Small option for initializing system when Admin is selected */}
                    {!isInitializingSuperAdmin && !isRegister && loginRole === 'admin' && (
                        <div style={{ textAlign: 'center', marginTop: '1rem' }} className="animate-fade-in">
                            <span 
                                onClick={() => setIsInitializingSuperAdmin(true)}
                                style={{ color: 'var(--primary-color)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Initialize System (Super Admin)
                            </span>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
