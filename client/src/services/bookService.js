import api from './api';

export const getBooks = async (category) => {
    const response = await api.get(`/books?category=${category}`);
    return response.data;
};

export const borrowBook = async (bookId) => {
    const response = await api.post(`/books/borrow/${bookId}`);
    return response.data;
};

export const reserveBook = async (bookId) => {
    const response = await api.post(`/books/reserve/${bookId}`);
    return response.data;
};
