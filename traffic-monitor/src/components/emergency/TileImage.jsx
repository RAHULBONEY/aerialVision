import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * TileImage Component
 * Securely fetches binary image bytes from the proxy server, creates an ObjectURL, and renders the `<img>`.
 */
export function TileImage({ tileId, proxyUrl, alt = 'satellite tile' }) {
    const [imageSrc, setImageSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let objectUrl = null;
        let isMounted = true;

        const fetchImageBytes = async () => {
            try {
                setLoading(true);
                // We use axios arraybuffer so we don't accidentally parse the binary payload as JSON
                const response = await axios.get(`${API_URL}/api/emergency/tiles/${tileId}`, {
                    responseType: 'arraybuffer',
                });

                // Backend may return 202 if it's still fetching in the BullMQ background queue
                if (response.status === 202) {
                    if (isMounted) setError(true);
                    return;
                }

                // Convert byte buffer to an ObjectURL for the browser `<img>` tag
                const blob = new Blob([response.data], { type: 'image/png' });
                objectUrl = URL.createObjectURL(blob);

                if (isMounted) {
                    setImageSrc(objectUrl);
                    setError(false);
                }
            } catch (err) {
                console.error('Failed to load tile image from proxy:', err);
                if (isMounted) setError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchImageBytes();

        // Cleanup memory when component unmounts
        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [tileId]);

    if (loading) {
        return <div className="w-16 h-16 bg-gray-800 animate-pulse rounded flex items-center justify-center text-xs text-gray-500">Wait...</div>;
    }

    if (error || !imageSrc) {
        return <div className="w-16 h-16 bg-gray-900 border border-red-500/50 rounded flex items-center justify-center text-xs text-red-400">Error</div>;
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            className="w-full h-full object-cover rounded shadow shadow-black/50"
            loading="lazy"
        />
    );
}
