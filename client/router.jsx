// src/Router.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import pages
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Import dashboards for roles
import AdminDashboard from './components/dashboards/AdminDashboard';
import ChiefLibrarianDashboard from './components/dashboards/ChiefLibrarianDashboard';
import LibrarianDashboard from './components/dashboards/LibrarianDashboard';
import AdultDashboard from './components/dashboards/AdultDashboard';
import JuniorDashboard from './components/dashboards/JuniorDashboard';

// Import context
import { useAuth } from './hooks/useAuth';

// Protected Route component
function ProtectedRoute({ children, allowedRoles }) {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Role-based dashboards */}
                <Route
                    path="/dashboard/admin"
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/chief-librarian"
                    element={
                        <ProtectedRoute allowedRoles={['chief_librarian']}>
                            <ChiefLibrarianDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/librarian"
                    element={
                        <ProtectedRoute allowedRoles={['librarian']}>
                            <LibrarianDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/adult"
                    element={
                        <ProtectedRoute allowedRoles={['adult_member']}>
                            <AdultDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/junior"
                    element={
                        <ProtectedRoute allowedRoles={['junior_member']}>
                            <JuniorDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Catch all - redirect unknown to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
