import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "../../services/api";

export default function BookDetails() {
    const { id } = useParams();
    const [book, setBook] = useState(null);

    useEffect(() => {
        axios.get(`/books/${id}`)
            .then(res => setBook(res.data))
            .catch(err => console.error(err));
    }, [id]);

    if (!book) return <p>Loading...</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold">{book.title}</h1>
            <p>Author: {book.author}</p>
            <p>Description: {book.description}</p>
            <p>Published: {book.publishedDate}</p>
        </div>
    );
}
