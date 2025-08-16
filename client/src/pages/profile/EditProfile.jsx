import { useState, useEffect } from "react";
import axios from "../../services/api";

export default function EditProfile() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        axios.get("/users/profile")
            .then(res => setFormData({ name: res.data.name, email: res.data.email }))
            .catch(err => console.error(err));
    }, []);

    const handleChange = e => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            await axios.put("/users/profile", formData);
            setMessage("Profile updated successfully.");
        } catch (error) {
            setMessage("Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-8 space-y-4">
            <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Name"
                required
            />
            <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="Email"
                required
            />
            <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white py-2 px-4 rounded"
            >
                {loading ? "Saving..." : "Save Changes"}
            </button>
            {message && <p className="text-center mt-2">{message}</p>}
        </form>
    );
}
