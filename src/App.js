// src/App.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';
import { ToastContainer, toast } from 'react-toastify'; // NEW: Import ToastContainer and toast
import 'react-toastify/dist/ReactToastify.css'; // NEW: Import toastify CSS

// Import contract addresses and ABIs
import { CONTRACT_ADDRESSES } from './config/contractAddresses';
import ProjectRegistryABI from './abi/ProjectRegistry.json';
import AttestationServiceABI from './abi/AttestationService.json';
import MockERC20ABI from './abi/MockERC20.json';
import QuadraticFundingABI from './abi/QuadraticFunding.json';

// Import components
import ProjectSubmissionForm from './components/ProjectSubmissionForm';
import ProjectList from './components/ProjectList';
import UserProfile from './components/UserProfile';
import AttestationManagement from './components/AttestationManagement';
import CopyToClipboardButton from './components/CopyToClipboardButton'; // NEW: Import CopyToClipboardButton

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
  const [mockCUSDContract, setMockCUSDContract] = useState(null);
  const [quadraticFundingContract, setQuadraticFundingContract] = useState(null);

  // --- UI/Loading State ---
  const [loading, setLoading] = useState(false);

  // Toast functions to replace setError
  const showError = (message) => {
    toast.error(message);
  };

  const showSuccess = (message) => {
    toast.success(message);
  };

  const [refreshProjects, setRefreshProjects] = useState(0); // Trigger for ProjectList refresh

  // --- NEW: Page Navigation State ---
  const [currentPage, setCurrentPage] = useState('projects'); // 'projects', 'submit', 'profile', or 'attest'


  // --- Function to Connect Wallet ---
  const connectWallet = async () => {
    setLoading(true);
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(newProvider);
        const newSigner = await newProvider.getSigner();
        setSigner(newSigner);

        const address = await newSigner.getAddress();
        setAccount(address);
        setIsConnected(true);

        const networkDetails = await newProvider.getNetwork();
        setNetwork(networkDetails.name);

        showSuccess("Wallet connected: " + address.substring(0, 6) + "..."); // Show success toast
        console.log("Wallet connected:", address);
        console.log("Network:", networkDetails.name);

      } else {
        showError("MetaMask or a compatible wallet is not installed."); // Show error toast
        console.log("MetaMask or a compatible wallet is not installed.");
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
      showError(`Error connecting wallet: ${err.message || err.toString()}`); // Use showError toast
    } finally {
      setLoading(false);
    }
  };

  // --- Effect Hook: Initialize Contracts when Provider/Signer are ready ---
  useEffect(() => {
    const initContracts = async () => {
      if (provider && signer) {
        try {
          const projectRegistry = new ethers.Contract(
            CONTRACT_ADDRESSES.projectRegistry,
            ProjectRegistryABI.abi,
            signer
          );
          setProjectRegistryContract(projectRegistry);

          const attestationService = new ethers.Contract(
            CONTRACT_ADDRESSES.attestationService,
            AttestationServiceABI.abi,
            signer
          );
          setAttestationServiceContract(attestationService);

          const mockCUSD = new ethers.Contract(
            CONTRACT_ADDRESSES.mockCUSD,
            MockERC20ABI.abi,
            signer
          );
          setMockCUSDContract(mockCUSD);

          const quadraticFunding = new ethers.Contract(
            CONTRACT_ADDRESSES.quadraticFunding,
            QuadraticFundingABI.abi,
            signer
          );
          setQuadraticFundingContract(quadraticFunding);

          console.log("Smart contracts initialized.");

        } catch (error) {
          console.error("Error initializing contracts:", error);
          showError("Failed to initialize contracts. Please check network and addresses."); // Use showError toast
          setProjectRegistryContract(null);
          setAttestationServiceContract(null);
          setMockCUSDContract(null);
          setQuadraticFundingContract(null);
        }
      }
    };

    initContracts();
  }, [provider, signer]);


  // --- Effect Hook: Check for existing connection on load and listen for changes ---
  useEffect(() => {
    const checkConnectionOnLoad = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          connectWallet();
        }
      }
    };
    checkConnectionOnLoad();

    if (window.ethereum) {
      const handleAccountsChanged = (newAccounts) => {
        if (newAccounts.length > 0) {
          connectWallet();
        } else {
          setIsConnected(false);
          setAccount(null);
          setSigner(null);
          setProvider(null);
          setProjectRegistryContract(null);
          setAttestationServiceContract(null);
          setMockCUSDContract(null);
          setQuadraticFundingContract(null);
          showError("Wallet disconnected."); // Show toast on disconnect
          console.log("Wallet disconnected.");
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // --- Callback for when a project is successfully submitted ---
  const handleProjectSubmitted = () => {
    setRefreshProjects(prev => prev + 1);
    setCurrentPage('projects'); // Navigate to projects page after submission
    showSuccess("Project submitted successfully!"); // Show success toast
  };

  return (
    <div className="App">
      {/* NEW: ToastContainer component for displaying notifications */}
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
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
              <p>
                Connected Account: <span className="connected-account-address">{account}</span>
                {/* NEW: Copy button for account address */}
                {account && <CopyToClipboardButton textToCopy={account} className="copy-button-small" />}
              </p>
              <p>Network: <span className="connected-network-name">{network}</span></p>
            </div>
          )}
        </div>

        {loading && <p className="status-message loading-message">Loading...</p>}


        {/* DApp Features Section (only show if wallet is connected) */}
        {isConnected && (
          <div className="dapp-features">
            <hr className="section-divider" />

            {/* Navigation Buttons */}
            <nav className="dapp-navigation">
              <button
                onClick={() => setCurrentPage('projects')}
                className={`nav-button ${currentPage === 'projects' ? 'active' : ''}`}
              >
                All Projects
              </button>
              <button
                onClick={() => setCurrentPage('submit')}
                className={`nav-button ${currentPage === 'submit' ? 'active' : ''}`}
              >
                Submit Project
              </button>
              <button
                onClick={() => setCurrentPage('profile')}
                className={`nav-button ${currentPage === 'profile' ? 'active' : ''}`}
              >
                My Profile
              </button>
              <button
                onClick={() => setCurrentPage('attest')}
                className={`nav-button ${currentPage === 'attest' ? 'active' : ''}`}
              >
                Attestation Admin
              </button>
            </nav>

            <hr className="section-divider" />

            {/* Conditional Rendering based on currentPage state */}
            {currentPage === 'projects' && (
              <ProjectList
                projectRegistryContract={projectRegistryContract}
                mockCUSDContract={mockCUSDContract}
                quadraticFundingContract={quadraticFundingContract}
                refreshTrigger={refreshProjects}
                setLoading={setLoading}
                setError={showError} // Pass showError function
                loading={loading}
              />
            )}

            {currentPage === 'submit' && (
              <ProjectSubmissionForm
                projectRegistryContract={projectRegistryContract}
                onProjectSubmitted={handleProjectSubmitted}
                setLoading={setLoading}
                setError={showError} // Pass showError function
                showSuccess={showSuccess} // Pass showSuccess function
                loading={loading}
              />
            )}

            {currentPage === 'profile' && (
              <UserProfile
                account={account}
                projectRegistryContract={projectRegistryContract}
                quadraticFundingContract={quadraticFundingContract}
                attestationServiceContract={attestationServiceContract}
                setLoading={setLoading}
                setError={showError} // Pass showError function
                loading={loading}
                mockCUSDContract={mockCUSDContract} // Pass mockCUSDContract
              />
            )}

            {currentPage === 'attest' && (
              <AttestationManagement
                account={account}
                attestationServiceContract={attestationServiceContract}
                setLoading={setLoading}
                setError={showError} // Pass showError function
                showSuccess={showSuccess} // Pass showSuccess function
                loading={loading}
              />
            )}
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


     