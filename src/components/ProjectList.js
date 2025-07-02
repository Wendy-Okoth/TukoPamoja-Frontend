// src/components/ProjectList.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
// Removed: import { create } from 'ipfs-http-client'; // No longer needed for updates
// Removed: import moment from 'moment'; // No longer needed for updates

// Make sure mockCUSDContract and quadraticFundingContract are passed as props from App.js
function ProjectList({ projectRegistryContract, refreshTrigger, setLoading, setError, loading, mockCUSDContract, quadraticFundingContract }) {
    const [projects, setProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAllProjects = async () => {
        if (!projectRegistryContract || !quadraticFundingContract) {
            setProjects([]);
            return;
        }

        setLoading(true); // Global loading for the DApp
        setError(null); // Clear previous errors via toast

        try {
            const rawProjects = await projectRegistryContract.getAllActiveProjects();
            const projectPromises = rawProjects.map(async (projectData) => {
                if (!projectData || projectData.id === undefined || projectData.id === null) {
                    console.warn("Skipping malformed project object due to missing or invalid 'id':", projectData);
                    return null; // Return null for invalid projects
                }

                let projectIdBigInt;
                let projectIdString;
                try {
                    projectIdBigInt = ethers.getBigInt(projectData.id);
                    projectIdString = projectIdBigInt.toString();
                } catch (e) {
                    console.warn(`Project ID '${projectData.id}' is not a valid BigInt, skipping project:`, projectData, e);
                    return null; // Return null for invalid project IDs
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
            setError(`Error fetching projects: ${errorMessage}`); // Use setError toast
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
                    {filteredProjects.map((project, index) => {
                        if (!project || project.idString === undefined || project.idString === null) {
                            console.warn("Skipping malformed project in JSX render due to missing idString:", project);
                            return null;
                        }

                        return (
                            <li key={project.idString} className="project-item">
                                <h4 className="project-item-title">{project.name} (ID: {project.idString || 'N/A'})</h4>
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
                                                <img
                                                    key={imgIndex}
                                                    src={`https://cloudflare-ipfs.com/ipfs/${cid}`}
                                                    alt={`Project Visual ${imgIndex + 1}`}
                                                    className="project-media-item project-image"
                                                    onError={(e) => { e.target.onerror = null; e.target.src="https://via.placeholder.com/150?text=Image+Load+Error"; }}
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
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

export default ProjectList;
