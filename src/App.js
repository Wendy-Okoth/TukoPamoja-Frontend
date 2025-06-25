import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers'; // Import ethers
import './App.css'; // Assuming you have an App.css
import { CONTRACT_ADDRESSES } from './config/contractAddresses'; // Import contract addresses
// Import ABIs
import ProjectRegistryABI from './abi/ProjectRegistry.json';
import AttestationServiceABI from './abi/AttestationService.json';
import MockERC20ABI from './abi/MockERC20.json'; // For mock CUSD
import QuadraticFundingABI from './abi/QuadraticFunding.json';


function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for contract instances (initialize as null)
  const [projectRegistryContract, setProjectRegistryContract] = useState(null);
  const [attestationServiceContract, setAttestationServiceContract] = useState(null);
  const [mockCUSDContract, setMockCUSDContract] = useState(null);
  const [quadraticFundingContract, setQuadraticFundingContract] = useState(null);

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

        const network = await newProvider.getNetwork();
        setNetwork(network.name); // e.g., 'goerli', 'mainnet', or 'unknown' for local

        // --- Instantiate Contracts Here (after wallet is connected and signer is available) ---
        // Note: When deploying to local Hardhat, network.name will often be 'unknown' or 'localhost'
        // Ethers.js handles this fine for direct contract interaction if provider is set up.

        const projectRegistry = new ethers.Contract(
          CONTRACT_ADDRESSES.projectRegistry,
          ProjectRegistryABI.abi, // .abi because it's in the artifact format
          newSigner // Use the signer for write operations
        );
        setProjectRegistryContract(projectRegistry);

        const attestationService = new ethers.Contract(
          CONTRACT_ADDRESSES.attestationService,
          AttestationServiceABI.abi,
          newSigner
        );
        setAttestationServiceContract(attestationService);

        const mockCUSD = new ethers.Contract(
          CONTRACT_ADDRESSES.mockCUSD,
          MockERC20ABI.abi,
          newSigner
        );
        setMockCUSDContract(mockCUSD);

        const quadraticFunding = new ethers.Contract(
          CONTRACT_ADDRESSES.quadraticFunding,
          QuadraticFundingABI.abi,
          newSigner
        );
        setQuadraticFundingContract(quadraticFunding);


        console.log("Wallet connected:", address);
        console.log("Network:", network.name);

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

  // --- Optional: Check for existing connection on load ---
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          // If accounts are already connected, try to connect immediately
          connectWallet();
        }
      }
    };
    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (newAccounts) => {
        if (newAccounts.length > 0) {
          connectWallet(); // Reconnect on account change
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
      });
      window.ethereum.on('chainChanged', () => {
        window.location.reload(); // Reload page on network change
      });
    }

    return () => {
      // Cleanup event listeners when component unmounts
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []); // Run once on component mount

  // --- Example of a contract interaction (e.g., getting project count) ---
  const [projectCount, setProjectCount] = useState(0);

  const fetchProjectCount = async () => {
    if (projectRegistryContract) {
      try {
        setLoading(true);
        setError(null);
        // Call a view function (no gas needed, just reading data)
        const count = await projectRegistryContract.getAllActiveProjects();
        setProjectCount(count.length); // Assuming getAllActiveProjects returns an array of project IDs or structs
        console.log("Fetched project count:", count.length);
      } catch (err) {
        console.error("Error fetching project count:", err);
        setError(`Error fetching projects: ${err.message || err.toString()}`);
      } finally {
        setLoading(false);
      }
    } else {
      console.log("ProjectRegistry contract not initialized.");
    }
  };

  // Use useEffect to fetch data when the contract instance is ready
  useEffect(() => {
    if (projectRegistryContract) {
      fetchProjectCount();
    }
  }, [projectRegistryContract]); // Re-run when projectRegistryContract changes

  return (
    <div className="App">
      <header className="App-header">
        <h1>Tuko Pamoja DApp</h1>
        {!isConnected ? (
          <button onClick={connectWallet} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div>
            <p>Connected Account: {account}</p>
            <p>Network: {network}</p>
            <p>Total Active Projects: {projectCount}</p>

            {/* Add your DApp features here */}
            <h2>DApp Features</h2>
            {/* Example: A simple button to refresh project count */}
            <button onClick={fetchProjectCount} disabled={loading}>
              {loading ? 'Fetching...' : 'Refresh Project Count'}
            </button>
            {/* You'll add components/forms for:
                - Submitting a new project
                - Viewing project details
                - Making attestations
                - Contributing to projects
            */}
          </div>
        )}

        {error && <p style={{ color: 'red' }}>Error: {error}</p>}

        <p>
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