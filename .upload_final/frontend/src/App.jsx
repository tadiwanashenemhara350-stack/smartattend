import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ThemeCustomizer from './components/ThemeCustomizer';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LecturerDashboard = lazy(() => import('./pages/LecturerDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));

function App() {
  return (
    <BrowserRouter>
      <ThemeCustomizer />
      <Suspense fallback={<div className="page-wrapper">Loading SmartAttend...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/lecturer/*" element={<LecturerDashboard />} />
          <Route path="/student/*" element={<StudentDashboard />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
