import api from './api';

export const initiateMpesaPayment = async (paymentData) => {
    const response = await api.post('/payments/mpesa', paymentData);
    return response.data;
};
