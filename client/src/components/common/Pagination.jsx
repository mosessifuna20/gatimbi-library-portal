import React from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
    return (
        <div className="flex space-x-2 justify-center mt-4">
            <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Prev</button>
            <span>{currentPage} / {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</button>
        </div>
    );
}
