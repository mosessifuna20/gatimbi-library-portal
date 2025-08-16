import React from 'react';

export default function Toast({ message }) {
    if (!message) return null;
    return (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded shadow">
            {message}
        </div>
    );
}
