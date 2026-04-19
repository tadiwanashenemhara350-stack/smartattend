import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QrScanner = ({ onScanSuccess, onScanFailure }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear scanner. ", error);
            });
        };
    }, [onScanSuccess, onScanFailure]);

    return (
        <div id="qr-reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: 'none' }}></div>
    );
};

export default QrScanner;
