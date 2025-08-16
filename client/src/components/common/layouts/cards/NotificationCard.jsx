import React from 'react';

export default function NotificationCard({ notification }) {
    return (
        <div className="border-l-4 border-blue-500 bg-blue-50 p-3 mb-2 rounded">
            <p>{notification.message}</p>
            <small className="text-gray-500">{new Date(notification.date).toLocaleString()}</small>
        </div>
    );
}
