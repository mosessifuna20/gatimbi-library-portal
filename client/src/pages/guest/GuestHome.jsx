import { Link } from "react-router-dom";

export default function GuestHome() {
    return (
        <div className="text-center mt-10">
            <h1 className="text-3xl font-bold mb-4">Welcome to Gatimbi Library</h1>
            <p className="mb-6">Explore our collection of books available for guests.</p>
            <Link to="/guest/books" className="text-blue-600 underline">
                Browse Books
            </Link>
        </div>
    );
}
