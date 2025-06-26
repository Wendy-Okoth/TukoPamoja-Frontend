// src/components/ProjectSubmissionForm.js
import React, { useState } from 'react';
import axios from 'axios'; // Import axios for HTTP requests

function ProjectSubmissionForm({ projectRegistryContract, onProjectSubmitted, setLoading, setError, loading }) {
    // State for basic form inputs
    const [projectName, setProjectName] = useState('');
    const [descriptionCID, setDescriptionCID] = useState('');
    const [category, setCategory] = useState('');

    // State for selected files (before upload to IPFS)
    const [selectedImageFiles, setSelectedImageFiles] = useState([]);
    const [selectedAudioFiles, setSelectedAudioFiles] = useState([]);

    // State to hold CIDs AFTER successful IPFS upload (before contract submission)
    const [finalImageCIDs, setFinalImageCIDs] = useState([]);
    const [finalAudioCIDs, setFinalAudioCIDs] = useState([]);

    // State for upload process feedback
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0); // Progress for the current file being uploaded

    // !!! IMPORTANT: Configure your Pinata API Keys here OR via .env !!!
    // It is highly recommended to use .env for security.
    // Create a .env file in your project root with:
    // REACT_APP_PINATA_API_KEY=YOUR_API_KEY
    // REACT_APP_PINATA_SECRET_API_KEY=YOUR_SECRET_API_KEY
    const pinataApiKey = process.env.REACT_APP_PINATA_API_KEY;
    const pinataSecretApiKey = process.env.REACT_APP_PINATA_SECRET_API_KEY;

    // Fallback if environment variables are not set (NOT recommended for production)
    // const FALLBACK_PINATA_API_KEY = 'YOUR_PINATA_API_KEY_HERE';
    // const FALLBACK_PINATA_SECRET_API_KEY = 'YOUR_PINATA_SECRET_API_KEY_HERE';


    // --- Handlers for file input changes ---
    const handleImageFileChange = (e) => {
        // Convert FileList to Array and update state
        setSelectedImageFiles(Array.from(e.target.files));
        // Reset previously uploaded CIDs if files are re-selected
        setFinalImageCIDs([]);
    };

    const handleAudioFileChange = (e) => {
        // Convert FileList to Array and update state
        setSelectedAudioFiles(Array.from(e.target.files));
        // Reset previously uploaded CIDs if files are re-selected
        setFinalAudioCIDs([]);
    };

    // --- Core IPFS Upload Function ---
    const uploadFileToIPFS = async (file) => {
        if (!pinataApiKey || !pinataSecretApiKey) {
            setError("Pinata API keys are not configured. Please check your .env file or hardcoded values.");
            return null;
        }

        const formData = new FormData();
        formData.append('file', file);

        const pinataOptions = JSON.stringify({
            cidVersion: 0, // Use CIDv0 for compatibility
            wrapWithDirectory: false, // Don't wrap in a directory
        });
        formData.append('pinataOptions', pinataOptions);

        try {
            const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
                maxBodyLength: Infinity, // This is important for large files
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                    'pinata_api_key': pinataApiKey,
                    'pinata_secret_api_key': pinataSecretApiKey,
                },
                onUploadProgress: (progressEvent) => {
                    // Calculate and update progress for the current file
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            return res.data.IpfsHash; // Return the CID
        } catch (error) {
            console.error(`Error uploading ${file.name} to Pinata:`, error.response ? error.response.data : error.message);
            setError(`Failed to upload "${file.name}" to IPFS. Check console for details.`);
            return null;
        }
    };

    // --- Main Form Submission Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        if (!projectRegistryContract) {
            setError("ProjectRegistry contract not initialized. Please connect wallet.");
            return;
        }
        if (!projectName || !descriptionCID || !category) {
            setError("Project Name, Description CID, and Category are required.");
            return;
        }

        setLoading(true); // Indicate overall submission process (including upload and transaction)
        setUploading(true); // Indicate file upload phase
        setError(null);

        let uploadedImgs = [];
        let uploadedAudios = [];

        try {
            // 1. Upload Image Files to IPFS
            if (selectedImageFiles.length > 0) {
                console.log("Starting image uploads...");
                for (const file of selectedImageFiles) {
                    const cid = await uploadFileToIPFS(file);
                    if (cid) {
                        uploadedImgs.push(cid);
                    } else {
                        // If any file upload fails, stop the process
                        setUploading(false); // End upload state
                        setLoading(false);   // End overall loading state
                        return; // Exit handleSubmit
                    }
                }
                console.log("All images uploaded. CIDs:", uploadedImgs);
                setFinalImageCIDs(uploadedImgs); // Store for display
            }

            // 2. Upload Audio Files to IPFS
            if (selectedAudioFiles.length > 0) {
                console.log("Starting audio uploads...");
                for (const file of selectedAudioFiles) {
                    const cid = await uploadFileToIPFS(file);
                    if (cid) {
                        uploadedAudios.push(cid);
                    } else {
                        // If any file upload fails, stop the process
                        setUploading(false); // End upload state
                        setLoading(false);   // End overall loading state
                        return; // Exit handleSubmit
                    }
                }
                console.log("All audio uploaded. CIDs:", uploadedAudios);
                setFinalAudioCIDs(uploadedAudios); // Store for display
            }

            setUploading(false); // Files are uploaded, now proceed to blockchain transaction

            // 3. Submit Project Data (including IPFS CIDs) to Smart Contract
            const tx = await projectRegistryContract.submitProject(
                projectName,
                descriptionCID,
                category,
                uploadedImgs, // Pass the CIDs obtained from IPFS upload
                uploadedAudios
            );

            console.log("Transaction sent:", tx.hash);
            alert(`Blockchain transaction sent! Waiting for confirmation (Hash: ${tx.hash})`);
            await tx.wait(); // Wait for the transaction to be mined
            console.log("Project submitted successfully on-chain!");
            alert("Project submitted successfully!");

            // Clear all form fields and states after successful submission
            setProjectName('');
            setDescriptionCID('');
            setCategory('');
            setSelectedImageFiles([]);
            setSelectedAudioFiles([]);
            setFinalImageCIDs([]); // Clear final CIDs display
            setFinalAudioCIDs([]); // Clear final CIDs display

            if (onProjectSubmitted) {
                onProjectSubmitted(); // Notify parent to refresh project list
            }

        } catch (err) {
            console.error("Error during project submission process:", err);
            const errorMessage = err.reason || err.data?.message || err.message || "Unknown error";
            setError(`Error submitting project: ${errorMessage}`);
        } finally {
            setLoading(false); // End overall loading state
            setUploading(false); // Ensure uploading state is false
            setUploadProgress(0); // Reset progress bar
        }
    };

    return (
        <div className="dapp-section project-submission-form-section">
            <h3 className="section-title">Submit New Project</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="projectName" className="label-text">Project Name:</label>
                    <input
                        type="text"
                        id="projectName"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        disabled={loading || uploading} // Disable during upload or transaction
                        placeholder="e.g., Community Garden Initiative"
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="descriptionCID" className="label-text">Description CID (IPFS Hash):</label>
                    <input
                        type="text"
                        id="descriptionCID"
                        value={descriptionCID}
                        onChange={(e) => setDescriptionCID(e.target.value)}
                        disabled={loading || uploading}
                        placeholder="e.g., QmHASH123... (for your main project description)"
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="category" className="label-text">Category:</label>
                    <input
                        type="text"
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={loading || uploading}
                        placeholder="e.g., Environment, Education, Art"
                        className="form-input"
                    />
                </div>

                {/* Image File Input Section */}
                <div className="form-group file-upload-group">
                    <label htmlFor="imageUpload" className="label-text">Upload Images (select one or multiple):</label>
                    <input
                        type="file"
                        id="imageUpload"
                        multiple // Allows selecting multiple files
                        accept="image/*" // Only allow image files
                        onChange={handleImageFileChange}
                        disabled={loading || uploading}
                        className="file-input"
                    />
                    {selectedImageFiles.length > 0 && (
                        <p className="selected-files-info">Selected: {selectedImageFiles.map(f => f.name).join(', ')}</p>
                    )}
                </div>

                {/* Audio File Input Section */}
                <div className="form-group file-upload-group">
                    <label htmlFor="audioUpload" className="label-text">Upload Audio (select one or multiple):</label>
                    <input
                        type="file"
                        id="audioUpload"
                        multiple // Allows selecting multiple files
                        accept="audio/*" // Only allow audio files
                        onChange={handleAudioFileChange}
                        disabled={loading || uploading}
                        className="file-input"
                    />
                    {selectedAudioFiles.length > 0 && (
                        <p className="selected-files-info">Selected: {selectedAudioFiles.map(f => f.name).join(', ')}</p>
                    )}
                </div>

                {/* Uploading/Loading Status Message */}
                {(uploading || loading) && (
                    <p className="status-message upload-status-info">
                        {uploading ? `Uploading files... ${uploadProgress}%` : 'Submitting transaction to blockchain...'}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading || uploading} // Disable if overall loading or actively uploading
                    className="submit-button"
                >
                    {loading ? 'Submitting...' : (uploading ? `Uploading ${uploadProgress}%` : 'Submit Project')}
                </button>
            </form>

            {/* Display CIDs of files that were just uploaded (for user confirmation before final submit) */}
            {(finalImageCIDs.length > 0 || finalAudioCIDs.length > 0) && (
                <div className="uploaded-cids-preview">
                    <h4>Successfully Uploaded Media CIDs (will be submitted):</h4>
                    {finalImageCIDs.length > 0 && (
                        <div>
                            <h5>Images:</h5>
                            <ul>
                                {finalImageCIDs.map((cid, idx) => (
                                    <li key={`img-${idx}`}><a href={`https://cloudflare-ipfs.com/ipfs/${cid}`} target="_blank" rel="noopener noreferrer">{cid}</a></li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {finalAudioCIDs.length > 0 && (
                        <div>
                            <h5>Audio:</h5>
                            <ul>
                                {finalAudioCIDs.map((cid, idx) => (
                                    <li key={`aud-${idx}`}><a href={`https://cloudflare-ipfs.com/ipfs/${cid}`} target="_blank" rel="noopener noreferrer">{cid}</a></li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ProjectSubmissionForm;
