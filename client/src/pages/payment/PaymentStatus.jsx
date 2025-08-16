import { useEffect, useState } from "react";

export default function PaymentStatus() {
    // You can fetch payment status or listen to webhooks here
    // For now, just a placeholder

    return (
        <div className="max-w-md mx-auto text-center mt-10">
            <h1 className="text-2xl font-bold">Payment Status</h1>
            <p>Status updates will appear here after implementing payment webhook and tracking.</p>
        </div>
    );
}
