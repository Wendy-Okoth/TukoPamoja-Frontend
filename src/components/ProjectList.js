// src/components/ProjectList.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers'; // Import ethers for BigInt and formatting utilities

// Make sure mockCUSDContract and quadraticFundingContract are passed as props from App.js
function ProjectList({ projectRegistryContract, refreshTrigger, setLoading, setError, loading, mockCUSDContract, quadraticFundingContract }) {
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // New state for search term
    const [contributionAmounts, setContributionAmounts] = useState({}); // State to hold contribution amount per project ID

    const fetchAllProjects = async () => {
        // Ensure both contracts are available before attempting to fetch
        if (!projectRegistryContract || !quadraticFundingContract) {
            setProjects([]); // Clear projects if contracts aren't ready
            return;
        }

        setLoading(true); // Set overall loading state
        setError(null);    // Clear previous errors

        try {
            // 1. Fetch basic project details from ProjectRegistry
            const rawProjects = await projectRegistryContract.getAllActiveProjects();
            console.log("Fetched raw projects from registry (before processing):", rawProjects); // Added console log

            const projectsWithStats = [];

            // 2. Loop through each project to fetch its contribution stats from QuadraticFunding
            for (const project of rawProjects) {
                // IMPORTANT: Add a check for malformed project objects or missing IDs
                if (!project || project.id === undefined || project.id === null) {
                    console.warn("Skipping malformed project object due to missing or invalid 'id':", project);
                    continue; // Skip this iteration if the project object is invalid
                }

                // ethers.js v6 returns BigInt for uint256 values
                const projectId = project.id; // project.id is already a BigInt from ethers v6

                let projectStats = {
                    totalContributions: ethers.getBigInt(0), // Initialize as BigInt 0
                    numUniqueContributors: ethers.getBigInt(0), // Initialize as BigInt 0
                    sumSqrtContributions: ethers.getBigInt(0), // Initialize as BigInt 0
                };

                try {
                    // Call getProjectStats on the QuadraticFunding contract
                    // This function returns tuple: (totalContributions, numUniqueContributors, sumSqrtContributions)
                    const fetchedStats = await quadraticFundingContract.getProjectStats(projectId);
                    projectStats = {
                        totalContributions: fetchedStats[0],
                        numUniqueContributors: fetchedStats[1],
                        sumSqrtContributions: fetchedStats[2],
                    };
                    console.log(`Stats for Project ID ${projectId.toString()}:`, projectStats); // Use .toString() for logging
                } catch (statsErr) {
                    // Log a warning if stats fetching fails for a specific project, but don't stop the whole process
                    console.warn(`Could not fetch stats for project ID ${projectId.toString()}:`, statsErr.message);
                }

                // Combine project details with its stats
                projectsWithStats.push({
                    ...project,
                    stats: projectStats // Add the stats object to the project
                });
            }

            setProjects(projectsWithStats); // Update state with projects including stats

        } catch (err) {
            console.error("Error fetching projects or stats:", err);
            const errorMessage = err.reason || err.data?.message || err.message || "Unknown error";
            setError(`Error fetching projects: ${errorMessage}`);
            setProjects([]); // Clear projects on major error
        } finally {
            setLoading(false); // End overall loading state
        }
    };

    // Effect hook to trigger fetching when contracts or refreshTrigger change
    useEffect(() => {
        // Only fetch if both necessary contracts are initialized
        if (projectRegistryContract && quadraticFundingContract) {
            fetchAllProjects();
        }
    }, [projectRegistryContract, quadraticFundingContract, refreshTrigger]); // Dependencies

    // Handler to update a specific project's contribution amount input field
    const handleContributionAmountChange = (projectId, amount) => {
        setContributionAmounts(prev => ({
            ...prev,
            [projectId]: amount
        }));
    };

    // --- Handle Approve cUSD ---
    const handleApprove = async (projectId, amount) => {
        if (!mockCUSDContract || !quadraticFundingContract) {
            setError("Contracts not initialized. Please connect wallet.");
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount to approve.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Convert human-readable amount (e.g., "10.5") to contract-readable Wei (18 decimals)
            const amountInWei = ethers.parseUnits(amount.toString(), 18);

            // Approve the QuadraticFunding contract to spend cUSD from the connected account
            // quadraticFundingContract.target gets the address of the deployed contract
            const tx = await mockCUSDContract.approve(quadraticFundingContract.target, amountInWei);
            console.log(`Approval transaction sent for Project ID ${projectId.toString()}:`, tx.hash);
            alert(`Approval transaction sent! Waiting for confirmation (Hash: ${tx.hash})`);
            await tx.wait(); // Wait for the transaction to be mined
            alert("mCUSD approved successfully for Quadratic Funding!");
            console.log("mCUSD approved successfully!");
        } catch (err) {
            console.error(`Error approving mCUSD for Project ID ${projectId.toString()}:`, err);
            const errorMessage = err.reason || err.data?.message || err.message || "Unknown error during approval";
            setError(`Error approving mCUSD: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Handle Contribute ---
    const handleContribute = async (projectId, amount) => {
        if (!quadraticFundingContract) {
            setError("QuadraticFunding contract not initialized. Please connect wallet.");
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount to contribute.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Convert human-readable amount to contract-readable Wei
            const amountInWei = ethers.parseUnits(amount.toString(), 18);

            // Call the contribute function on the QuadraticFunding contract
            const tx = await quadraticFundingContract.contribute(projectId, amountInWei);
            console.log(`Contribution transaction sent for Project ID ${projectId.toString()}:`, tx.hash);
            alert(`Contribution transaction sent! Waiting for confirmation (Hash: ${tx.hash})`);
            await tx.wait(); // Wait for the transaction to be mined
            alert("Contribution successful!");
            console.log("Contribution successful!");

            // Clear the contribution amount input for this project
            setContributionAmounts(prev => ({
                ...prev,
                [projectId]: ''
            }));

            // Crucial: Refresh the project list after a successful contribution
            // This will re-fetch updated stats from the blockchain
            fetchAllProjects();

        } catch (err) {
            console.error(`Error contributing to Project ID ${projectId.toString()}:`, err);
            const errorMessage = err.reason || err.data?.message || err.message || "Unknown error during contribution";
            setError(`Error contributing: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // Filter projects based on the search term (name and category)
    const filteredProjects = projects.filter(project => {
        // Add checks to ensure name and category exist before calling toLowerCase()
        // Use an empty string if undefined/null to prevent error
        const projectNameLower = project.name ? project.name.toLowerCase() : '';
        const categoryLower = project.category ? project.category.toLowerCase() : '';
        const searchTermLower = searchTerm.toLowerCase(); // Convert search term once

        return projectNameLower.includes(searchTermLower) || categoryLower.includes(searchTermLower);
    });

    return (
        <div className="dapp-section project-list-section">
            <h3 className="section-title">All Active Projects</h3>

            {/* Search Input Field */}
            <div className="search-group">
                <input
                    type="text"
                    placeholder="Search by Project Name or Category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                    disabled={loading}
                />
            </div>

            <button
                onClick={fetchAllProjects} // Manual refresh button
                disabled={loading}
                className="refresh-button"
            >
                {loading ? 'Refreshing...' : 'Refresh Projects'}
            </button>

            {loading && projects.length === 0 && <p className="info-text">Loading projects...</p>}
            {!loading && projects.length === 0 && <p className="info-text">No projects found yet. Be the first to submit one!</p>}
            {filteredProjects.length === 0 && !loading && projects.length > 0 && searchTerm !== '' && (
                <p className="info-text">No projects match your search.</p>
            )}

            {filteredProjects.length > 0 && (
                <ul className="project-list-ul">
                    {filteredProjects.map((project, index) => (
                        // Use project.id.toString() for the key, as project.id is a BigInt.
                        // Add a fallback key if project.id somehow becomes invalid.
                        <li key={project.id ? project.id.toString() : `project-${index}`} className="project-item">
                            {/* Safely access and display project.id */}
                            <h4 className="project-item-title">{project.name} (ID: {project.id ? project.id.toString() : 'N/A'})</h4>
                            <p><strong className="project-item-strong-label">Owner:</strong> {project.owner}</p>
                            <p>
                                <strong className="project-item-strong-label">Description CID:</strong>
                                {project.descriptionCID ? (
                                    <a href={`https://cloudflare-ipfs.com/ipfs/${project.descriptionCID}`} target="_blank" rel="noopener noreferrer">
                                        {project.descriptionCID}
                                    </a>
                                ) : 'N/A'}
                            </p>
                            <p><strong className="project-item-strong-label">Category:</strong> {project.category}</p>
                            <p><strong className="project-item-strong-label">Active:</strong> {project.isActive ? 'Yes' : 'No'}</p>

                            {/* --- New: Display Contribution Stats --- */}
                            {project.stats && (
                                <div className="project-stats-section">
                                    <h5 className="stats-section-title">Funding Progress:</h5>
                                    <p>
                                        <strong className="project-item-strong-label">Total Contributed:</strong>
                                        {/* Format BigInt to a human-readable number with 18 decimals */}
                                        {ethers.formatUnits(project.stats.totalContributions, 18)} mCUSD
                                    </p>
                                    <p>
                                        <strong className="project-item-strong-label">Unique Contributors:</strong>
                                        {/* Convert BigInt to string for display */}
                                        {project.stats.numUniqueContributors.toString()}
                                    </p>
                                </div>
                            )}

                            {/* Display Images */}
                            {project.imageCIDs && project.imageCIDs.length > 0 && (
                                <div className="project-media-section">
                                    <h5 className="media-section-title">Images:</h5>
                                    <div className="media-container images-container">
                                        {project.imageCIDs.map((cid, imgIndex) => (
                                            <img
                                                key={imgIndex}
                                                src={`https://cloudflare-ipfs.com/ipfs/${cid}`}
                                                alt={`Project Visual ${imgIndex + 1}`}
                                                className="project-media-item project-image"
                                                onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/150?text=Image+Load+Error"; }} // Fallback
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Display Audio */}
                            {project.audioCIDs && project.audioCIDs.length > 0 && (
                                <div className="project-media-section">
                                    <h5 className="media-section-title">Audio:</h5>
                                    <div className="media-container audio-container">
                                        {project.audioCIDs.map((cid, audioIndex) => (
                                            <audio key={audioIndex} controls className="project-media-item project-audio">
                                                <source src={`https://cloudflare-ipfs.com/ipfs/${cid}`} type="audio/mpeg" />
                                                Your browser does not support the audio element.
                                            </audio>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Contribution Section */}
                            <div className="contribution-section">
                                <h5>Contribute mCUSD:</h5>
                                <input
                                    type="number"
                                    placeholder="Amount (e.g., 10.5)"
                                    value={contributionAmounts[project.id] || ''}
                                    onChange={(e) => handleContributionAmountChange(project.id, e.target.value)}
                                    min="0.01"
                                    step="0.01"
                                    className="form-input contribution-input"
                                    disabled={loading}
                                />
                                <div className="contribution-buttons">
                                    <button
                                        onClick={() => handleApprove(project.id, contributionAmounts[project.id])}
                                        disabled={loading || !contributionAmounts[project.id] || parseFloat(contributionAmounts[project.id]) <= 0}
                                        className="submit-button approve-button"
                                    >
                                        Approve mCUSD
                                    </button>
                                    <button
                                        onClick={() => handleContribute(project.id, contributionAmounts[project.id])}
                                        disabled={loading || !contributionAmounts[project.id] || parseFloat(contributionAmounts[project.id]) <= 0}
                                        className="submit-button contribute-button"
                                    >
                                        Contribute
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default ProjectList;
