import { useState, useEffect, useContext, createContext } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const auth = useProvideAuth();
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    return useContext(AuthContext);
};

function useProvideAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Simulate fetching user from localStorage or API
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        setLoading(true);
        const response = await authService.login(credentials);
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        setLoading(false);
        return response;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return {
        user,
        loading,
        login,
        logout,
    };
}
