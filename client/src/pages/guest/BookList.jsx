import { useEffect, useState } from "react";
import axios from "../../services/api";

export default function BookList() {
    const [books, setBooks] = useState([]);

    useEffect(() => {
        axios.get("/books") // assuming this returns all books visible to guests
            .then(res => setBooks(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="max-w-4xl mx-auto mt-6">
            <h2 className="text-2xl font-semibold mb-4">Available Books</h2>
            {books.length === 0 ? (
                <p>No books available currently.</p>
            ) : (
                <ul className="space-y-2">
                    {books.map(book => (
                        <li key={book._id} className="border p-4 rounded hover:shadow">
                            <h3 className="font-bold">{book.title}</h3>
                            <p>Author: {book.author}</p>
                            <p>Subject: {book.subject}</p>
                            <p>Type: {book.type}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
