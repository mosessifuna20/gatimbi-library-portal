import { useEffect, useState } from "react";
import axios from "../../services/api";

export default function PaymentHistory() {
    const [payments, setPayments] = useState([]);

    useEffect(() => {
        axios.get("/payments/history")
            .then(res => setPayments(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="max-w-4xl mx-auto mt-8">
            <h1 className="text-2xl font-bold mb-4">Payment History</h1>
            <table className="w-full border-collapse border border-gray-300">
                <thead>
                <tr>
                    <th className="border border-gray-300 p-2">Date</th>
                    <th className="border border-gray-300 p-2">Amount</th>
                    <th className="border border-gray-300 p-2">Status</th>
                    <th className="border border-gray-300 p-2">Reference</th>
                </tr>
                </thead>
                <tbody>
                {payments.length === 0 ? (
                    <tr><td colSpan="4" className="text-center p-4">No payments found.</td></tr>
                ) : (
                    payments.map(payment => (
                        <tr key={payment._id}>
                            <td className="border border-gray-300 p-2">{new Date(payment.date).toLocaleString()}</td>
                            <td className="border border-gray-300 p-2">{payment.amount}</td>
                            <td className="border border-gray-300 p-2">{payment.status}</td>
                            <td className="border border-gray-300 p-2">{payment.reference}</td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </div>
    );
}
