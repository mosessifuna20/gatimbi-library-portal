import { useAuth } from './useAuth';

// Hook to check user role and permissions
export default function useRole() {
    const { user } = useAuth();

    // Function to check if user has a specific role
    function hasRole(role) {
        if (!user || !user.role) return false;
        return user.role.toLowerCase() === role.toLowerCase();
    }

    // Example: check multiple roles
    function hasAnyRole(roles = []) {
        if (!user || !user.role) return false;
        return roles.map(r => r.toLowerCase()).includes(user.role.toLowerCase());
    }

    return {
        userRole: user?.role || 'guest',
        hasRole,
        hasAnyRole,
    };
}
