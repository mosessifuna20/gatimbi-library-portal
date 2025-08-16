
export default function Input({ label, type = 'text', value, onChange, name, placeholder, required = false }) {
    return (
        <div className="flex flex-col mb-4">
            {label && <label className="mb-1 font-semibold">{label}</label>}
            <input
                type={type}
                value={value}
                onChange={onChange}
                name={name}
                placeholder={placeholder}
                required={required}
                className="border rounded px-3 py-2 focus:outline-blue-500"
            />
        </div>
    );
}
