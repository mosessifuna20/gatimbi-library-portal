
export default function Select({ label, name, value, onChange, options = [], required = false }) {
    return (
        <div className="flex flex-col mb-4">
            {label && <label className="mb-1 font-semibold">{label}</label>}
            <select
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className="border rounded px-3 py-2 focus:outline-blue-500"
            >
                <option value="">Select an option</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
