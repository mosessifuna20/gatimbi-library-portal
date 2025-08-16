import React from 'react';

export default function Avatar({ src, alt }) {
    return (
        <img
            src={src}
            alt={alt}
            className="w-10 h-10 rounded-full object-cover"
        />
    );
}
