// src/components/CopyToClipboardButton.js
import React from 'react';
import { toast } from 'react-toastify'; // Import toast for notifications

/**
 * A reusable button component to copy text to the clipboard.
 * Shows a toast notification on successful copy.
 *
 * @param {object} props - The component props.
 * @param {string} props.textToCopy - The string value to be copied to the clipboard.
 * @param {string} [props.buttonText='Copy'] - Optional text for the button.
 * @param {string} [props.className='copy-button'] - Optional CSS class for styling.
 * @param {string} [props.successMessage='Copied to clipboard!'] - Optional success message for the toast.
 * @param {string} [props.errorMessage='Failed to copy!'] - Optional error message for the toast.
 */
function CopyToClipboardButton({ textToCopy, buttonText = 'Copy', className = 'copy-button', successMessage = 'Copied to clipboard!', errorMessage = 'Failed to copy!' }) {

    const handleCopy = async () => {
        if (!textToCopy) {
            toast.warn("Nothing to copy!");
            return;
        }
        try {
            // Use the modern Clipboard API
            await navigator.clipboard.writeText(textToCopy);
            toast.success(successMessage);
        } catch (err) {
            console.error('Failed to copy text:', err);
            toast.error(errorMessage);
        }
    };

    return (
        <button onClick={handleCopy} className={className}>
            {buttonText}
        </button>
    );
}

export default CopyToClipboardButton;