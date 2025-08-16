import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "../../services/api";

export default function EditBook() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: "",
        author: "",
        description: "",
        publishedDate: ""
    });

    useEffect(() => {
        axios.get(`/books/${id}`)
            .then(res => setFormData(res.data))
            .catch(err => console.error(err));
    }, [id]);

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        try {
            await axios.put(`/books/${id}`, formData);
            alert("Book updated successfully!");
            navigate("/books");
        } catch (err) {
            console.error(err);
            alert("Failed to update book.");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
            <input name="title" value={formData.title} onChange={handleChange} placeholder="Title" className="w-full p-2 border rounded" required />
            <input name="author" value={formData.author} onChange={handleChange} placeholder="Author" className="w-full p-2 border rounded" required />
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className="w-full p-2 border rounded" />
            <input name="publishedDate" value={formData.publishedDate} onChange={handleChange} placeholder="Published Date" className="w-full p-2 border rounded" />
            <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded">Update Book</button>
        </form>
    );
}
