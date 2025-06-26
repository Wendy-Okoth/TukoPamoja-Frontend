// src/App.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers'; // Import ethers
import './App.css'; // Assuming you have an App.css

// Import contract addresses and ABIs
import { CONTRACT_ADDRESSES } from './config/contractAddresses';
import ProjectRegistryABI from './abi/ProjectRegistry.json';
import AttestationServiceABI from './abi/AttestationService.json';
import MockERC20ABI from './abi/MockERC20.json'; // ABI for Mock cUSD
import QuadraticFundingABI from './abi/QuadraticFunding.json';

// Import components
import ProjectSubmissionForm from './components/ProjectSubmissionForm';
import ProjectList from './components/ProjectList';

function App() {
  // --- Wallet and Network State ---
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [network, setNetwork] = useState(null);

  // --- Contract Instances State ---
  const [projectRegistryContract, setProjectRegistryContract] = useState(null);
  const [attestationServiceContract, setAttestationServiceContract] = useState(null);
  const [mockCUSDContract, setMockCUSDContract] = useState(null); // State for Mock cUSD contract
  const [quadraticFundingContract, setQuadraticFundingContract] = useState(null); // State for Quadratic Funding contract

  // --- UI/Loading/Error State ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshProjects, setRefreshProjects] = useState(0); // Trigger for ProjectList refresh


  // --- Function to Connect Wallet ---
  const connectWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      if (window.ethereum) { // Check if MetaMask or similar provider is available
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // Create a Web3Provider from Metamask's provider
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(newProvider);

        // Get the signer (connected account)
        const newSigner = await newProvider.getSigner();
        setSigner(newSigner);

        const address = await newSigner.getAddress();
        setAccount(address);
        setIsConnected(true);

        const networkDetails = await newProvider.getNetwork();
        setNetwork(networkDetails.name); // e.g., 'goerli', 'mainnet', or 'unknown' for local

        console.log("Wallet connected:", address);
        console.log("Network:", networkDetails.name);

      } else {
        setError("MetaMask or a compatible wallet is not installed.");
        console.log("MetaMask or a compatible wallet is not installed.");
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(`Error connecting wallet: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Effect Hook: Initialize Contracts when Provider/Signer are ready ---
  useEffect(() => {
    const initContracts = async () => {
      if (provider && signer) {
        try {
          // Initialize ProjectRegistry Contract
          const projectRegistry = new ethers.Contract(
            CONTRACT_ADDRESSES.projectRegistry,
            ProjectRegistryABI.abi, // .abi because it's in the artifact format
            signer // Use the signer for write operations
          );
          setProjectRegistryContract(projectRegistry);

          // Initialize AttestationService Contract
          const attestationService = new ethers.Contract(
            CONTRACT_ADDRESSES.attestationService,
            AttestationServiceABI.abi,
            signer
          );
          setAttestationServiceContract(attestationService);

          // Initialize Mock cUSD Contract (for approve function)
          const mockCUSD = new ethers.Contract(
            CONTRACT_ADDRESSES.mockCUSD,
            MockERC20ABI.abi, // Assuming MockERC20ABI is your cUSD token's ABI
            signer
          );
          setMockCUSDContract(mockCUSD);

          // Initialize Quadratic Funding Contract
          const quadraticFunding = new ethers.Contract(
            CONTRACT_ADDRESSES.quadraticFunding,
            QuadraticFundingABI.abi,
            signer
          );
          setQuadraticFundingContract(quadraticFunding);

          console.log("Smart contracts initialized.");

        } catch (error) {
          console.error("Error initializing contracts:", error);
          setError("Failed to initialize contracts. Please check network and addresses.");
          // Clear contract instances if initialization fails
          setProjectRegistryContract(null);
          setAttestationServiceContract(null);
          setMockCUSDContract(null);
          setQuadraticFundingContract(null);
        }
      }
    };

    initContracts();
  }, [provider, signer]); // Re-run when provider or signer changes


  // --- Effect Hook: Check for existing connection on load and listen for changes ---
  useEffect(() => {
    const checkConnectionOnLoad = async () => {
      if (window.ethereum) {
        // Attempt to connect if accounts are already present (e.g., user already connected MetaMask)
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          connectWallet(); // If accounts exist, try to connect
        }
      }
    };
    checkConnectionOnLoad();

    // Set up event listeners for MetaMask changes
    if (window.ethereum) {
      const handleAccountsChanged = (newAccounts) => {
        if (newAccounts.length > 0) {
          connectWallet(); // Reconnect if accounts change
        } else {
          // Wallet disconnected
          setIsConnected(false);
          setAccount(null);
          setSigner(null);
          setProvider(null);
          setProjectRegistryContract(null);
          setAttestationServiceContract(null);
          setMockCUSDContract(null);
          setQuadraticFundingContract(null);
          console.log("Wallet disconnected.");
        }
      };

      const handleChainChanged = () => {
        window.location.reload(); // Reload page on network change
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Cleanup function for event listeners
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []); // Run once on component mount


  // --- Callback for when a project is successfully submitted ---
  const handleProjectSubmitted = () => {
    setRefreshProjects(prev => prev + 1); // Increment to trigger re-fetch in ProjectList
    // You could also add a success message display here
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Tuko Pamoja DApp</h1>

        {/* Wallet Connection Section */}
        <div className="wallet-connect-section dapp-section">
          {!isConnected ? (
            <button onClick={connectWallet} disabled={loading} className="connect-button">
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div>
              <p>Connected Account: <span className="connected-account-address">{account}</span></p>
              <p>Network: <span className="connected-network-name">{network}</span></p>
            </div>
          )}
        </div>

        {/* Global Loading and Error Messages */}
        {loading && <p className="status-message loading-message">Loading...</p>}
        {error && <p className="status-message error-message">Error: {error}</p>}

        {/* DApp Features Section (only show if wallet is connected) */}
        {isConnected && (
          <div className="dapp-features">
            <hr className="section-divider" />

            {/* Project Submission Form */}
            <ProjectSubmissionForm
              projectRegistryContract={projectRegistryContract}
              // attestationServiceContract is not directly used by submitProject in the contract
              // so it's not needed as a prop for ProjectSubmissionForm
              onProjectSubmitted={handleProjectSubmitted}
              setLoading={setLoading}
              setError={setError}
              loading={loading}
            />

            <hr className="section-divider" />

            {/* Project List */}
            <ProjectList
              projectRegistryContract={projectRegistryContract}
              mockCUSDContract={mockCUSDContract}
              quadraticFundingContract={quadraticFundingContract}
              refreshTrigger={refreshProjects}
              setLoading={setLoading}
              setError={setError}
              loading={loading}
            />
          </div>
        )}

        {/* Footer/Info */}
        <p className="app-info">
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://react.dev/learn"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;

     