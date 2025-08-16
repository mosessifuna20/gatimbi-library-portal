import { useEffect, useState } from "react";
import axios from "../../services/api";

export default function BookList() {
    const [books, setBooks] = useState([]);

    useEffect(() => {
        axios.get("/books")
            .then(res => setBooks(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Books</h1>
            <ul className="space-y-2">
                {books.map(book => (
                    <li key={book._id} className="border p-3 rounded shadow">
                        <h2 className="text-xl font-semibold">{book.title}</h2>
                        <p>{book.author}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}
