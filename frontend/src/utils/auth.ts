import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
    exp: number;
    sub: string;
    email: string;
    role: string;
}

export const isAuthenticated = (): boolean => {
    const token = localStorage.getItem('token');

    // Check existence
    if (!token) return false;

    try {
        // Decode token
        const decoded = jwtDecode<DecodedToken>(token);
        const currentTime = Date.now() / 1000;

        // Check expiry
        if (decoded.exp < currentTime) {
            logout(); // Auto-logout if expired
            return false;
        }

        return true;
    } catch (error) {
        // If decoding fails, token is invalid
        logout();
        return false;
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    // Optional: Redirect to login if called explicitly, usually handled by component logic
};

export const getToken = () => localStorage.getItem('token');
