import React from 'react';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';

export default function DashboardLayout({ children }) {
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1">
                <Navbar />
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
