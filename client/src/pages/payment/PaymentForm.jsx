import { useState } from "react";
import axios from "../../services/api";

export default function PaymentForm() {
    const [phone, setPhone] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handlePayment = async e => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const res = await axios.post("/payments/mpesa-stkpush", { phone, amount });
            setMessage("Payment initiated. Check your phone to complete.");
        } catch (error) {
            setMessage("Payment failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handlePayment} className="max-w-md mx-auto space-y-4">
            <input
                type="tel"
                placeholder="Phone number (e.g., 2547XXXXXXXX)"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2 border rounded"
                required
            />
            <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full p-2 border rounded"
                required
            />
            <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white py-2 px-4 rounded"
            >
                {loading ? "Processing..." : "Pay with M-Pesa"}
            </button>
            {message && <p className="mt-2 text-center">{message}</p>}
        </form>
    );
}
