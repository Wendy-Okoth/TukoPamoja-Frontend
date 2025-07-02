// src/components/UserProfile.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import CopyToClipboardButton from './CopyToClipboardButton'; // NEW: Import CopyToClipboardButton

// Assume a list of attestation types your system might issue
const ATTESTATION_TYPES_TO_CHECK = ["Artist", "Verified Builder", "Community Member", "Contributor"];

function UserProfile({ account, projectRegistryContract, quadraticFundingContract, attestationServiceContract, setLoading, setError, loading, mockCUSDContract }) {
    const [ownedProjects, setOwnedProjects] = useState([]);
    const [contributedProjects, setContributedProjects] = useState([]);
    const [userAttestations, setUserAttestations] = useState({});
    const [profileLoading, setProfileLoading] = useState(true); // Separate loading state for profile
    const [mcUSDbalance, setMcusdBalance] = useState('0'); // State for mCUSD balance

    const fetchUserProfileData = async () => {
        if (!account || !projectRegistryContract || !quadraticFundingContract || !attestationServiceContract || !mockCUSDContract) {
            setOwnedProjects([]);
            setContributedProjects([]);
            setUserAttestations({});
            setMcusdBalance('0');
            setProfileLoading(false);
            return;
        }

        setProfileLoading(true);
        setError(null); // Clear errors specific to profile page via toast

        try {
            // --- Step 1: Launch all independent top-level fetches in parallel ---
            const [
                allProjectsRaw,
                mcUSDbalanceRaw,
                fetchedAttestationsPromises
            ] = await Promise.all([
                projectRegistryContract.getAllActiveProjects(),
                mockCUSDContract.balanceOf(account),
                Promise.all(
                    ATTESTATION_TYPES_TO_CHECK.map(async (type) => {
                        try {
                            const hasAttestation = await attestationServiceContract.hasAttestationType(account, type);
                            return { type, hasAttestation };
                        } catch (attestationErr) {
                            console.warn(`Could not check attestation type "${type}" for ${account}:`, attestationErr.message);
                            return { type, hasAttestation: false }; // Assume false on error
                        }
                    })
                )
            ]);

            // --- Step 2: Process fetched data ---

            // Process mCUSD Balance
            setMcusdBalance(ethers.formatUnits(mcUSDbalanceRaw, 18));

            // Process Attestations
            const newAttestations = {};
            fetchedAttestationsPromises.forEach(({ type, hasAttestation }) => {
                newAttestations[type] = hasAttestation;
            });
            setUserAttestations(newAttestations);

            // Process Projects to Determine Owned and Contributed
            const owned = [];
            const contributedPromises = []; // Collect promises for contributions

            for (const project of allProjectsRaw) {
                if (!project || project.id === undefined || project.id === null) {
                    console.warn("Skipping malformed project object in UserProfile due to missing or invalid 'id':", project);
                    continue;
                }

                // Check if user is the owner
                if (project.owner && project.owner.toLowerCase() === account.toLowerCase()) {
                    owned.push(project);
                }

                // Prepare promise for user's contribution to this project
                contributedPromises.push(
                    (async () => {
                        try {
                            const contributorAmount = await quadraticFundingContract.getContributorAmount(project.id, account);
                            if (contributorAmount > ethers.getBigInt(0)) {
                                return {
                                    ...project,
                                    yourContribution: contributorAmount
                                };
                            }
                            return null; // No contribution
                        } catch (contributionErr) {
                            console.warn(`Could not get contribution for project ID ${project.id.toString()} by ${account}:`, contributionErr.message);
                            return null; // On error, treat as no contribution
                        }
                    })()
                );
            }

            // Execute all contribution checks in parallel
            const allContributions = await Promise.all(contributedPromises);
            setContributedProjects(allContributions.filter(p => p !== null)); // Filter out nulls

            setOwnedProjects(owned); // Set owned projects after the loop

        } catch (err) {
            console.error("Error fetching user profile data:", err);
            const errorMessage = err.reason || err.data?.message || err.message || "Unknown error fetching profile";
            setError(`Error loading profile: ${errorMessage}`); // Use setError toast
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        if (account && projectRegistryContract && quadraticFundingContract && attestationServiceContract && mockCUSDContract) {
            fetchUserProfileData();
        }
    }, [account, projectRegistryContract, quadraticFundingContract, attestationServiceContract, mockCUSDContract]);

    return (
        <div className="dapp-section user-profile-section">
            <h3 className="section-title">My Profile</h3>

            {profileLoading ? (
                <p className="info-text">Loading your profile data...</p>
            ) : (
                <>
                    <p>
                        <strong>Wallet Address:</strong> {account}
                        {account && <CopyToClipboardButton textToCopy={account} className="copy-button-small" />} {/* NEW: Copy button */}
                    </p>
                    <p><strong>mCUSD Balance:</strong> {mcUSDbalance} mCUSD</p>

                    {/* Attestations Section */}
                    <div className="profile-subsection">
                        <h4 className="subsection-title">My Attestations:</h4>
                        {Object.keys(userAttestations).length > 0 ? (
                            <ul>
                                {Object.entries(userAttestations).map(([type, has]) => (
                                    <li key={type}>
                                        <strong className="attestation-type-label">{type}:</strong> {has ? '✅ Yes' : '❌ No'}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="info-text">No attestations found or checked.</p>
                        )}
                    </div>

                    {/* Owned Projects Section */}
                    <div className="profile-subsection">
                        <h4 className="subsection-title">Projects I Own ({ownedProjects.length}):</h4>
                        {ownedProjects.length > 0 ? (
                            <ul className="project-list-ul">
                                {ownedProjects.map((project, index) => (
                                    <li key={project.id ? project.id.toString() : `owned-${index}`} className="project-item">
                                        <h5 className="project-item-title">
                                            {project.name} (ID: {project.id ? project.id.toString() : 'N/A'})
                                        </h5>
                                        <p>
                                            Description CID: {project.descriptionCID}
                                            {project.descriptionCID && <CopyToClipboardButton textToCopy={project.descriptionCID} className="copy-button-small" />} {/* NEW: Copy button */}
                                        </p>
                                        <p>Category: {project.category}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="info-text">You don't own any active projects yet.</p>
                        )}
                    </div>

                    {/* Contributed Projects Section */}
                    <div className="profile-subsection">
                        <h4 className="subsection-title">Projects I've Contributed To ({contributedProjects.length}):</h4>
                        {contributedProjects.length > 0 ? (
                            <ul className="project-list-ul">
                                {contributedProjects.map((project, index) => (
                                    <li key={project.id ? project.id.toString() : `contributed-${index}`} className="project-item">
                                        <h5 className="project-item-title">
                                            {project.name} (ID: {project.id ? project.id.toString() : 'N/A'})
                                        </h5>
                                        <p>Your Contribution: {ethers.formatUnits(project.yourContribution, 18)} mCUSD</p>
                                        {/* You could add a copy button for project.id here too if desired */}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="info-text">You haven't contributed to any projects yet.</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default UserProfile;