import React from 'react';

export default function BookCard({ book }) {
    return (
        <div className="border rounded p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold">{book.title}</h3>
            <p>Author: {book.author}</p>
            <p>Subject: {book.subject}</p>
            <p>Price: ${book.price}</p>
            <p>Copies: {book.copies}</p>
        </div>
    );
}

