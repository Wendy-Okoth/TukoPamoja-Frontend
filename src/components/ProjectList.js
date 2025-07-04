// src/components/ProjectList.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import CopyToClipboardButton from './CopyToClipboardButton';

// Make sure mockCUSDContract and quadraticFundingContract are passed as props from App.js
function ProjectList({ projectRegistryContract, refreshTrigger, setLoading, setError, loading, mockCUSDContract, quadraticFundingContract, account, showSuccess }) {
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAllProjects = async () => {
        if (!projectRegistryContract || !quadraticFundingContract) {
            setProjects([]);
            return;
        }

        setLoading(true); // Global loading for the DApp

        try {
            const rawProjects = await projectRegistryContract.getAllActiveProjects();
            const projectPromises = rawProjects.map(async (projectData) => {
                // Robust check for projectData.id before conversion
                if (!projectData || !projectData.id || isNaN(Number(projectData.id))) {
                    console.warn("Skipping malformed project object due to missing or invalid 'id':", projectData);
                    return null; // Return null for invalid projects
                }

                let projectIdBigInt;
                let projectIdString;
                try {
                    projectIdBigInt = ethers.getBigInt(projectData.id);
                    projectIdString = projectIdBigInt.toString();
                } catch (e) {
                    console.warn(`Project ID '${projectData.id}' could not be converted to BigInt, skipping project:`, projectData, e);
                    return null; // Return null for invalid project IDs that fail BigInt conversion
                }

                let projectStats = {
                    totalContributions: ethers.getBigInt(0),
                    numUniqueContributors: ethers.getBigInt(0),
                    sumSqrtContributions: ethers.getBigInt(0),
                };

                try {
                    const fetchedStats = await quadraticFundingContract.getProjectStats(projectIdBigInt);
                    projectStats = {
                        totalContributions: fetchedStats[0],
                        numUniqueContributors: fetchedStats[1],
                        sumSqrtContributions: fetchedStats[2],
                    };
                } catch (statsErr) {
                    console.warn(`Could not fetch stats for project ID ${projectIdString}:`, statsErr.message);
                }

                const finalProject = {
                    ...projectData,
                    id: projectIdBigInt,
                    idString: projectIdString,
                    stats: projectStats,
                };
                return finalProject;
            });

            // Use Promise.all to fetch all project details in parallel
            const projectsWithStats = (await Promise.all(projectPromises)).filter(p => p !== null); // Filter out nulls from failed promises

            setProjects(projectsWithStats);

        } catch (err) {
            console.error("Error fetching projects or stats:", err);
            const errorMessage = err.reason || err.data?.message || err.message || "Unknown error";
            setError(`Error fetching projects: ${errorMessage}`); // Use setError toast (which is showError from App.js)
            setProjects([]);
        } finally {
            setLoading(false); // Global loading off
        }
    };

    useEffect(() => {
        if (projectRegistryContract && quadraticFundingContract) {
            fetchAllProjects();
        }
    }, [projectRegistryContract, quadraticFundingContract, refreshTrigger]);

    const filteredProjects = projects.filter(project => {
        if (!project || !project.name || !project.category) {
            return false;
        }
        const projectNameLower = project.name.toLowerCase();
        const categoryLower = project.category.toLowerCase();
        const searchTermLower = searchTerm.toLowerCase();

        return projectNameLower.includes(searchTermLower) || categoryLower.includes(searchTermLower);
    });

    // --- ProjectItem Component (nested for simplicity, could be extracted) ---
    const ProjectItem = ({ project }) => {
        const [contributionAmount, setContributionAmount] = useState('');
        // Removed: const [currentAllowance, setCurrentAllowance] = useState(ethers.getBigInt(0));
        // Removed: const [isApproving, setIsApproving] = useState(false);
        const [isContributing, setIsContributing] = useState(false);

        // Removed: useEffect for fetching allowance

        // Removed: handleApprove function

        const handleContribute = async () => {
            if (!account || !quadraticFundingContract || !contributionAmount || !project.id) {
                setError("Wallet not connected, contracts not ready, contribution amount or project ID is missing.");
                return;
            }

            const amountToContribute = ethers.parseUnits(contributionAmount, 18); // Convert to BigInt (wei)
            if (amountToContribute <= ethers.getBigInt(0)) {
                setError("Please enter a contribution amount greater than zero.");
                return;
            }

            // Note: The transaction will likely fail on-chain if allowance is not set beforehand by the user.

            setIsContributing(true);
            setLoading(true); // Global loading

            try {
                const tx = await quadraticFundingContract.contribute(project.id, amountToContribute);
                showSuccess(`Contribution transaction sent! Waiting for confirmation (Hash: ${tx.hash.substring(0, 6)}...).`);
                await tx.wait();
                showSuccess(`Successfully contributed ${contributionAmount} mCUSD to ${project.name}!`);
                setContributionAmount(''); // Clear input
                // Trigger a refresh of project list to update stats
                fetchAllProjects(); // Re-fetch all projects to update stats
            } catch (err) {
                console.error("Error during contribution:", err);
                const errorMessage = err.reason || err.data?.message || err.message || "Unknown error during contribution";
                setError(`Failed to contribute: ${errorMessage}`);
            } finally {
                setIsContributing(false);
                setLoading(false); // Global loading off
            }
        };

        // Simplified canContribute as approval is no longer handled by a button
        const canContribute = parseFloat(contributionAmount) > 0;


        return (
            <li key={project.idString} className="project-item">
                <h4 className="project-item-title">{project.name} (ID: {project.idString || 'N/A'})</h4>
                <p>
                    <strong className="project-item-strong-label">Owner:</strong> {project.owner}
                    {project.owner && <CopyToClipboardButton textToCopy={project.owner} className="copy-button-small" />}
                </p>
                <p>
                    <strong className="project-item-strong-label">Description CID:</strong>
                    {project.descriptionCID ? (
                        <>
                            <a href={`https://cloudflare-ipfs.com/ipfs/${project.descriptionCID}`} target="_blank" rel="noopener noreferrer">
                                {project.descriptionCID}
                            </a>
                            <CopyToClipboardButton textToCopy={project.descriptionCID} className="copy-button-small" />
                        </>
                    ) : 'N/A'}
                </p>
                <p><strong className="project-item-strong-label">Category:</strong> {project.category}</p>
                <p><strong className="project-item-strong-label">Active:</strong> {project.isActive ? 'Yes' : 'No'}</p>

                {/* Display Contribution Stats */}
                {project.stats && (
                    <div className="project-stats-section">
                        <h5 className="stats-section-title">Funding Progress:</h5>
                        <p>
                            <strong className="project-item-strong-label">Total Contributed:</strong>
                            {ethers.formatUnits(project.stats.totalContributions, 18)} mCUSD
                        </p>
                        <p>
                            <strong className="project-item-strong-label">Unique Contributors:</strong>
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
                                <div key={`img-container-${imgIndex}`} className="media-item-wrapper">
                                    <img
                                        src={`https://cloudflare-ipfs.com/ipfs/${cid}`}
                                        alt={`Project Visual ${imgIndex + 1}`}
                                        className="project-media-item project-image"
                                        onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/150?text=Image+Load+Error"; }}
                                    />
                                    <a href={`https://cloudflare-ipfs.com/ipfs/${cid}`} target="_blank" rel="noopener noreferrer" className="cid-link-small">
                                        {cid.substring(0, 10)}... {/* Show truncated CID */}
                                    </a>
                                    <CopyToClipboardButton textToCopy={cid} className="copy-button-small" />
                                </div>
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
                                <div key={`audio-container-${audioIndex}`} className="media-item-wrapper">
                                    <audio controls className="project-media-item project-audio">
                                        <source src={`https://cloudflare-ipfs.com/ipfs/${cid}`} type="audio/mpeg" />
                                        Your browser does not support the audio element.
                                    </audio>
                                    <a href={`https://cloudflare-ipfs.com/ipfs/${cid}`} target="_blank" rel="noopener noreferrer" className="cid-link-small">
                                        {cid.substring(0, 10)}... {/* Show truncated CID */}
                                    </a>
                                    <CopyToClipboardButton textToCopy={cid} className="copy-button-small" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Contribution Section */}
                {account && ( // Only show if wallet is connected
                    <div className="contribution-section">
                        <h5 className="subsection-title">Contribute to this Project</h5>
                        {/* Removed allowance display */}
                        <div className="form-group contribution-input-group">
                            <label htmlFor={`contribution-${project.idString}`} className="label-text">Amount (mCUSD):</label>
                            <input
                                type="number"
                                id={`contribution-${project.idString}`}
                                value={contributionAmount}
                                onChange={(e) => setContributionAmount(e.target.value)}
                                placeholder="e.g., 10.5"
                                step="0.01"
                                min="0"
                                className="form-input"
                                disabled={isContributing || loading} // isApproving removed
                            />
                        </div>
                        <div className="button-group">
                            {/* Removed Approve button */}
                            <button
                                onClick={handleContribute}
                                disabled={!canContribute || isContributing || loading} // isApproving removed
                                className="submit-button contribute-button"
                            >
                                {isContributing ? 'Contributing...' : 'Contribute'}
                            </button>
                        </div>
                        <p className="info-text small-text-warning">
                            Note: You must approve the QuadraticFunding contract to spend your mCUSD tokens
                            before contributing. This approval needs to be done separately (e.g., via a block explorer or another tool).
                        </p>
                    </div>
                )}
            </li>
        );
    };

    return (
        <div className="dapp-section project-list-section">
            <h3 className="section-title">All Active Projects</h3>

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
                onClick={fetchAllProjects}
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
                        <ProjectItem
                            key={project.idString || `project-${index}`}
                            project={project}
                            account={account}
                            mockCUSDContract={mockCUSDContract}
                            quadraticFundingContract={quadraticFundingContract}
                            setLoading={setLoading}
                            setError={setError}
                            showSuccess={showSuccess}
                            loading={loading}
                            fetchAllProjects={fetchAllProjects} // Pass fetchAllProjects to allow re-fetching from child
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

export default ProjectList;
