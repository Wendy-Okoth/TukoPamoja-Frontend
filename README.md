The frontend is a React.js application that provides the user interface for interacting with the smart contracts and IPFS.

Technology Stack: Built with React, JavaScript, HTML, and CSS. It uses ethers.js for Web3 interactions and react-toastify for user notifications.

Decentralized Hosting: The compiled React application (the build folder) is deployed to IPFS (InterPlanetary File System) via a pinning service like Pinata. This makes the DApp's interface censorship-resistant and accessible via IPFS gateways (e.g., ipfs.io).

IPFS Content Integration: Project descriptions, images, and audio files are stored on IPFS, and the frontend retrieves them using their CIDs via IPFS gateways.

Interaction Flow:

Wallet Connection: Connects to the user's MetaMask wallet using ethers.js.

Contract Initialization: Once connected, it initializes ethers.Contract instances for all deployed smart contracts, allowing read and write operations.

Navigation: Provides a navigation bar to switch between different DApp sections:

All Projects: Fetches project data from ProjectRegistry and contribution stats from QuadraticFunding to display a list of active projects.

Submit Project: Allows users to input project details and calls ProjectRegistry.registerProject. This function is guarded by the AttestationService (requiring an 'Artist' attestation).

My Profile: Displays projects owned by the connected user (from ProjectRegistry), their mCUSD balance (from MockERC20), their attestations (from AttestationService), and matching funds available for their projects (from QuadraticFunding).

Attestation Admin: Provides an interface for the contract owner to add/remove attestors, and for attestors to issue new attestations.

Transaction Handling: All write operations (e.g., submitting a project, contributing, issuing an attestation, withdrawing funds) are initiated from the frontend, signed by the user's wallet, and sent to the blockchain.
