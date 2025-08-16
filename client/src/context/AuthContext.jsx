import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Example: Load user from localStorage or API on mount
    useEffect(() => {
        const storedUser = localStorage.getItem("gatimbiUser");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem("gatimbiUser", JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("gatimbiUser");
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
