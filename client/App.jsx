// src/App.jsx
import React from 'react';
import { AuthProvider } from './context/AuthContext';
import Router from './Router';

function App() {
    return (
        <AuthProvider>
            <Router />
        </AuthProvider>
    );
}

export default App;
