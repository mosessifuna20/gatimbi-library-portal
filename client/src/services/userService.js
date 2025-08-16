import api from './api';

export const getUserProfile = async () => {
    const response = await api.get('/users/profile');
    return response.data;
};

export const updateUserProfile = async (data) => {
    const response = await api.put('/users/profile', data);
    return response.data;
};

export const getAllUsers = async () => {
    const response = await api.get('/users');
    return response.data;
};
