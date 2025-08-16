import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

export default function App() {
    return (
        <Router>
            {/* Full height flex container */}
            <div className="flex flex-col min-h-screen bg-gray-100">

                {/* Navbar */}
                <nav className="bg-blue-600 p-4 text-white flex justify-between">
                    <Link to="/" className="font-bold text-xl">Gatimbi Library</Link>
                    <div className="space-x-4">
                        <Link to="/login" className="hover:underline">Login</Link>
                        <Link to="/register" className="hover:underline">Register</Link>
                    </div>
                </nav>

                {/* Scrollable main content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        {/* Add other routes as needed */}
                    </Routes>
                </main>

                {/* Footer (optional) */}
                <footer className="bg-gray-800 text-white text-center py-3 text-sm">
                    &copy; {new Date().getFullYear()} Gatimbi Library Portal
                </footer>

                {/* Toast notifications */}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: { background: '#363636', color: '#fff' },
                        success: { duration: 3000, iconTheme: { primary: '#10B981', secondary: '#fff' } },
                        error: { duration: 4000, iconTheme: { primary: '#EF4444', secondary: '#fff' } },
                    }}
                />
            </div>
        </Router>
    );
}
