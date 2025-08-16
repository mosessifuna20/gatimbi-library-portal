import React from 'react';

export default function Breadcrumb({ items }) {
    return (
        <nav className="text-sm text-gray-600 my-4">
            {items.map((item, i) => (
                <span key={i}>
          {item}
                    {i < items.length - 1 && ' > '}
        </span>
            ))}
        </nav>
    );
}

