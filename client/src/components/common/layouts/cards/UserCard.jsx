import React from 'react';
import Avatar from '../common/Avatar';

export default function UserCard({ user }) {
    return (
        <div className="border rounded p-4 flex items-center space-x-4 shadow">
            <Avatar src={user.photoUrl} alt={user.name} />
            <div>
                <h3 className="font-bold">{user.name}</h3>
                <p>{user.role}</p>
                <p>{user.email}</p>
            </div>
        </div>
    );
}
