// src/components/UserProfile.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Assume a list of attestation types your system might issue
// You can expand this array as you add more attestation types
const ATTESTATION_TYPES_TO_CHECK = ["Artist", "Verified Builder", "Community Member", "Contributor"];

function UserProfile({ account, projectRegistryContract, quadraticFundingContract, attestationServiceContract, setLoading, setError, loading }) {
    const [ownedProjects, setOwnedProjects] = useState([]);
    const [contributedProjects, setContributedProjects] = useState([]);
    const [userAttestations, setUserAttestations] = useState({}); // { "Artist": true, "Verified Builder": false }
    const [profileLoading, setProfileLoading] = useState(true); // Separate loading state for profile

    const fetchUserProfileData = async () => {
        // Ensure all necessary contracts and account are available
        if (!account || !projectRegistryContract || !quadraticFundingContract || !attestationServiceContract) {
            setOwnedProjects([]);
            setContributedProjects([]);
            setUserAttestations({});
            setProfileLoading(false);
            return;
        }

        setProfileLoading(true);
        setError(null); // Clear errors specific to profile page

        try {
            // --- Fetch All Projects to Determine Owned and Contributed ---
            const allProjects = await projectRegistryContract.getAllActiveProjects();
            const owned = [];
            const contributed = [];

            for (const project of allProjects) {
                // IMPORTANT: Add safety check for the project object and its ID
                if (!project || project.id === undefined || project.id === null) {
                    console.warn("Skipping malformed project object in UserProfile due to missing or invalid 'id':", project);
                    continue; // Skip this iteration if the project object is invalid
                }

                // Check if user is the owner
                // Ensure owner address exists and convert to lowercase for case-insensitive comparison
                if (project.owner && project.owner.toLowerCase() === account.toLowerCase()) {
                    owned.push(project);
                }

                // Check for user's contribution to this project
                try {
                    const contributorAmount = await quadraticFundingContract.getContributorAmount(project.id, account);
                    // Check if the contributor has sent any amount greater than zero
                    if (contributorAmount > ethers.getBigInt(0)) {
                        contributed.push({
                            ...project,
                            yourContribution: contributorAmount // Store the amount contributed by this user
                        });
                    }
                } catch (contributionErr) {
                    // Log but don't stop if fetching individual contribution fails
                    console.warn(`Could not get contribution for project ID ${project.id.toString()} by ${account}:`, contributionErr.message);
                }
            }
            setOwnedProjects(owned);
            setContributedProjects(contributed);

            // --- Fetch User Attestations ---
            const attestations = {};
            for (const type of ATTESTATION_TYPES_TO_CHECK) {
                try {
                    const hasAttestation = await attestationServiceContract.hasAttestationType(account, type);
                    attestations[type] = hasAttestation;
                } catch (attestationErr) {
                    console.warn(`Could not check attestation type "${type}" for ${account}:`, attestationErr.message);
                    attestations[type] = false; // Assume false on error
                }
            }
            setUserAttestations(attestations);

        } catch (err) {
            console.error("Error fetching user profile data:", err);
            const errorMessage = err.reason || err.data?.message || err.message || "Unknown error fetching profile";
            setError(`Error loading profile: ${errorMessage}`);
        } finally {
            setProfileLoading(false);
        }
    };

    // Effect hook to fetch data when dependencies change
    useEffect(() => {
        fetchUserProfileData();
    }, [account, projectRegistryContract, quadraticFundingContract, attestationServiceContract]); // Re-fetch if these change

    return (
        <div className="dapp-section user-profile-section">
            <h3 className="section-title">My Profile</h3>

            {profileLoading ? (
                <p className="info-text">Loading your profile data...</p>
            ) : (
                <>
                    <p><strong>Wallet Address:</strong> {account}</p>

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
                                {ownedProjects.map((project, index) => ( // Added index for fallback key
                                    // Safety check for project.id before calling toString()
                                    <li key={project.id ? project.id.toString() : `owned-${index}`} className="project-item">
                                        <h5 className="project-item-title">
                                            {project.name} (ID: {project.id ? project.id.toString() : 'N/A'})
                                        </h5>
                                        <p>Description CID: {project.descriptionCID}</p>
                                        <p>Category: {project.category}</p>
                                        {/* You can add more details or links to view full project */}
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
                                {contributedProjects.map((project, index) => ( // Added index for fallback key
                                    // Safety check for project.id before calling toString()
                                    <li key={project.id ? project.id.toString() : `contributed-${index}`} className="project-item">
                                        <h5 className="project-item-title">
                                            {project.name} (ID: {project.id ? project.id.toString() : 'N/A'})
                                        </h5>
                                        <p>Your Contribution: {ethers.formatUnits(project.yourContribution, 18)} mCUSD</p>
                                        {/* You can add more details or links */}
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