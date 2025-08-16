import { useState, useEffect } from 'react';

export default function useFetch(url, options) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        fetch(url, options)
            .then(res => {
                if (!res.ok) throw new Error('Network response not ok');
                return res.json();
            })
            .then(data => {
                if (isMounted) {
                    setData(data);
                    setError(null);
                }
            })
            .catch(err => {
                if (isMounted) setError(err.message);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [url]);

    return { data, loading, error };
}
