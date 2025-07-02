// src/components/AttestationManagement.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Define common attestation types for dropdown/suggestion
const COMMON_ATTESTATION_TYPES = ["Artist", "Verified Builder", "Community Member", "Judge", "Developer"];

// Added showSuccess prop
function AttestationManagement({ account, attestationServiceContract, setLoading, setError, showSuccess, loading }) {
    // State for Owner-only section
    const [attestorAddressInput, setAttestorAddressInput] = useState('');
    const [isOwner, setIsOwner] = useState(false);

    // State for Attestor-specific section
    const [recipientAddressInput, setRecipientAddressInput] = useState('');
    const [attestationTypeInput, setAttestationTypeInput] = useState('');
    const [isAttestor, setIsAttestor] = useState(false);

    // Removed: const [attestationStatusMessage, setAttestationStatusMessage] = useState(''); // For feedback

    // --- Fetch Owner and Attestor Status ---
    const checkRoles = async () => {
        if (!attestationServiceContract || !account) {
            setIsOwner(false);
            setIsAttestor(false);
            return;
        }

        // Removed: setError(null); // Errors now handled by toasts

        try {
            // Check if connected account is the owner
            const ownerAddress = await attestationServiceContract.owner();
            setIsOwner(ownerAddress.toLowerCase() === account.toLowerCase());

            // Check if connected account is an attestor
            const isConnectedAccountAttestor = await attestationServiceContract.isAttestor(account);
            setIsAttestor(isConnectedAccountAttestor);

            console.log(`Connected account (${account}) is owner: ${ownerAddress.toLowerCase() === account.toLowerCase()}`);
            console.log(`Connected account (${account}) is attestor: ${isConnectedAccountAttestor}`);

        } catch (err) {
            console.error("Error checking owner/attestor roles:", err);
            setError(`Error checking roles: ${err.message || 'Unknown error'}`); // Use setError toast
            setIsOwner(false);
            setIsAttestor(false);
        }
    };

    // Use effect to check roles on account/contract change
    useEffect(() => {
        checkRoles();
    }, [account, attestationServiceContract]);


    // --- Owner Functions ---
    const handleAddAttestor = async (e) => {
        e.preventDefault();
        if (!attestationServiceContract || !attestorAddressInput) {
            setError("AttestationService contract not ready or address is empty."); // Use setError toast
            return;
        }
        if (!ethers.isAddress(attestorAddressInput)) {
            setError("Invalid Ethereum address for attestor."); // Use setError toast
            return;
        }

        setLoading(true); // Use the global loading state
        // Removed: setError(null);
        // Removed: setAttestationStatusMessage('');

        try {
            const tx = await attestationServiceContract.addAttestor(attestorAddressInput);
            // Removed: setAttestationStatusMessage(`Add Attestor Tx sent: ${tx.hash}`);
            console.log("Add Attestor Tx sent:", tx.hash);
            await tx.wait();
            showSuccess(`Attestor ${attestorAddressInput.substring(0, 6)}... added successfully!`); // Show success toast
            setAttestorAddressInput(''); // Clear input
            await checkRoles(); // Re-check roles as state might have changed
        } catch (err) {
            console.error("Error adding attestor:", err);
            const errorMessage = err.reason || err.data?.message || err.message || "Unknown error";
            setError(`Error adding attestor: ${errorMessage}`); // Use setError toast
        } finally {
            setLoading(false); // Use the global loading state
        }
    };

    const handleRemoveAttestor = async (e) => {
        e.preventDefault();
        if (!attestationServiceContract || !attestorAddressInput) {
            setError("AttestationService contract not ready or address is empty."); // Use setError toast
            return;
        }
        if (!ethers.isAddress(attestorAddressInput)) {
            setError("Invalid Ethereum address for attestor."); // Use setError toast
            return;
        }

        setLoading(true); // Use the global loading state
        // Removed: setError(null);
        // Removed: setAttestationStatusMessage('');

        try {
            const tx = await attestationServiceContract.removeAttestor(attestorAddressInput);
            // Removed: setAttestationStatusMessage(`Remove Attestor Tx sent: ${tx.hash}`);
            console.log("Remove Attestor Tx sent:", tx.hash);
            await tx.wait();
            showSuccess(`Attestor ${attestorAddressInput.substring(0, 6)}... removed successfully!`); // Show success toast
            setAttestorAddressInput(''); // Clear input
            await checkRoles(); // Re-check roles
        } catch (err) {
            console.error("Error removing attestor:", err);
            const errorMessage = err.reason || err.data?.message || err.message || "Unknown error";
            setError(`Error removing attestor: ${errorMessage}`); // Use setError toast
        } finally {
            setLoading(false); // Use the global loading state
        }
    };

    // --- Attestor Functions ---
    const handleIssueAttestation = async (e) => {
        e.preventDefault();
        if (!attestationServiceContract || !recipientAddressInput || !attestationTypeInput) {
            setError("AttestationService contract not ready, recipient, or attestation type is empty."); // Use setError toast
            return;
        }
        if (!ethers.isAddress(recipientAddressInput)) {
            setError("Invalid Ethereum address for recipient."); // Use setError toast
            return;
        }

        setLoading(true); // Use the global loading state
        // Removed: setError(null);
        // Removed: setAttestationStatusMessage('');

        try {
            // For now, use a placeholder hash. In a real scenario, this might come from off-chain data.
            const attestationHash = ethers.keccak256(ethers.toUtf8Bytes(attestationTypeInput + recipientAddressInput + Date.now()));

            const tx = await attestationServiceContract.issueAttestation(
                recipientAddressInput,
                attestationTypeInput,
                attestationHash
            );
            // Removed: setAttestationStatusMessage(`Issue Attestation Tx sent: ${tx.hash}`);
            console.log("Issue Attestation Tx sent:", tx.hash);
            await tx.wait();
            showSuccess(`Attestation '${attestationTypeInput}' issued to ${recipientAddressInput.substring(0, 6)}... successfully!`); // Show success toast
            setRecipientAddressInput(''); // Clear inputs
            setAttestationTypeInput('');
        } catch (err) {
            console.error("Error issuing attestation:", err);
            const errorMessage = err.reason || err.data?.message || err.message || "Unknown error";
            setError(`Error issuing attestation: ${errorMessage}`); // Use setError toast
        } finally {
            setLoading(false); // Use the global loading state
        }
    };


    return (
        <div className="dapp-section attestation-management-section">
            <h3 className="section-title">Attestation Management</h3>

            {/* Check if contracts are initialized or if App.js is in a global loading state */}
            {loading || !attestationServiceContract ? (
                <p className="info-text">Loading roles and contract status...</p>
            ) : (
                <>
                    <p><strong>Connected Account:</strong> {account}</p>
                    <p><strong>Is Owner:</strong> {isOwner ? '✅ Yes' : '❌ No'}</p>
                    <p><strong>Is Attestor:</strong> {isAttestor ? '✅ Yes' : '❌ No'}</p>

                    {/* Removed: attestationStatusMessage display */}

                    {/* Owner-only Section */}
                    {isOwner && (
                        <div className="profile-subsection owner-controls">
                            <h4 className="subsection-title">Owner Controls (Add/Remove Attestors)</h4>
                            <form onSubmit={(e) => e.preventDefault()}>
                                <div className="form-group">
                                    <label htmlFor="attestorAddress" className="label-text">Attestor Address:</label>
                                    <input
                                        type="text"
                                        id="attestorAddress"
                                        value={attestorAddressInput}
                                        onChange={(e) => setAttestorAddressInput(e.target.value)}
                                        placeholder="0x..."
                                        className="form-input"
                                        disabled={loading}
                                    />
                                </div>
                                <div className="button-group">
                                    <button
                                        onClick={handleAddAttestor}
                                        disabled={loading || !attestorAddressInput || !ethers.isAddress(attestorAddressInput)}
                                        className="submit-button"
                                    >
                                        Add Attestor
                                    </button>
                                    <button
                                        onClick={handleRemoveAttestor}
                                        disabled={loading || !attestorAddressInput || !ethers.isAddress(attestorAddressInput)}
                                        className="submit-button remove-button"
                                    >
                                        Remove Attestor
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Attestor-specific Section */}
                    {isAttestor && (
                        <div className="profile-subsection attestor-controls">
                            <h4 className="subsection-title">Attestor Controls (Issue Attestation)</h4>
                            <form onSubmit={handleIssueAttestation}>
                                <div className="form-group">
                                    <label htmlFor="recipientAddress" className="label-text">Recipient Address:</label>
                                    <input
                                        type="text"
                                        id="recipientAddress"
                                        value={recipientAddressInput}
                                        onChange={(e) => setRecipientAddressInput(e.target.value)}
                                        placeholder="0x..."
                                        className="form-input"
                                        disabled={loading}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="attestationType" className="label-text">Attestation Type:</label>
                                    <input
                                        type="text"
                                        id="attestationType"
                                        list="commonAttestationTypes" // Link to datalist for suggestions
                                        value={attestationTypeInput}
                                        onChange={(e) => setAttestationTypeInput(e.target.value)}
                                        placeholder="e.g., Artist, Verified Builder"
                                        className="form-input"
                                        disabled={loading}
                                    />
                                    {/* Datalist for suggestions */}
                                    <datalist id="commonAttestationTypes">
                                        {COMMON_ATTESTATION_TYPES.map(type => (
                                            <option key={type} value={type} />
                                        ))}
                                    </datalist>
                                </div>
                                {/* attestationHash is generated internally for simplicity */}
                                <button
                                    type="submit"
                                    disabled={loading || !recipientAddressInput || !attestationTypeInput || !ethers.isAddress(recipientAddressInput)}
                                    className="submit-button"
                                >
                                    Issue Attestation
                                </button>
                            </form>
                        </div>
                    )}

                    {!isOwner && !isAttestor && (
                        <p className="info-text">You are neither the owner nor an attestor. No attestation management controls are available.</p>
                    )}
                </>
            )}
        </div>
    );
}

export default AttestationManagement;