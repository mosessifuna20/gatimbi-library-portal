import React from 'react';
import Navbar from '../common/Navbar';
import Sidebar from '../common/Sidebar';

export default function MainLayout({ children }) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1">
                <Navbar />
                <main className="p-4">{children}</main>
            </div>
        </div>
    );
}
