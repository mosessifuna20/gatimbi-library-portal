import { useEffect, useState } from "react";
import axios from "../../services/api";

export default function ProfileView() {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        axios.get("/users/profile")
            .then(res => setProfile(res.data))
            .catch(err => console.error(err));
    }, []);

    if (!profile) return <p>Loading...</p>;

    return (
        <div className="max-w-md mx-auto mt-8">
            <h1 className="text-2xl font-bold mb-4">My Profile</h1>
            <p><strong>Name:</strong> {profile.name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Role:</strong> {profile.role}</p>
            {/* Add more fields as needed */}
        </div>
    );
}
