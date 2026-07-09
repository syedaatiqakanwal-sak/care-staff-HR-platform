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
    localStorage.removeItem('readOnly');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    sessionStorage.removeItem('dbs_notification_shown');
};

export const getToken = () => localStorage.getItem('token');

export const setSessionFromLogin = (data: {
    access_token: string;
    user: { id: string; role: string; name?: string; readOnly?: boolean };
}) => {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', data.user.role);
    localStorage.setItem('readOnly', String(Boolean(data.user.readOnly)));
    if (data.user.name) localStorage.setItem('userName', data.user.name);
    localStorage.setItem('userId', data.user.id);
};
