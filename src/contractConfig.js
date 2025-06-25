// tukopamoja-frontend/src/contractConfig.js

// 1. Import all your contract ABIs
//    These paths should point to the .json files you placed in src/abi/
import AttestationServiceABI from './abi/AttestationService.json';
import ProjectRegistryABI from './abi/ProjectRegistry.json';
import QuadraticFundingABI from './abi/QuadraticFunding.json';
import MockERC20ABI from './abi/MockERC20.json';

// 2. Define the deployed addresses for EACH contract on EACH network
//    *** IMPORTANT: YOU MUST REPLACE THESE PLACEHOLDERS WITH YOUR ACTUAL DEPLOYED CONTRACT ADDRESSES ***
//    These addresses come from your contract deployment process (e.g., from Hardhat's deploy scripts output).
const CONTRACT_ADDRESSES = {
  // --- Local Development Network (Hardhat, Ganache, etc.) - Common Chain ID: 31337 ---
  // MockERC20 deployed here
  31337: { // Hardhat Network's default Chain ID
    attestationService: '0xYourAttestationServiceAddressHere_Local', // Placeholder for local deployment
    projectRegistry: '0xYourProjectRegistryAddressHere_Local',   // Placeholder for local deployment
    quadraticFunding: '0xYourQuadraticFundingAddressHere_Local',   // Placeholder for local deployment
    mockERC20: '0x5FbDB2315678afecb367f032d93F642f64180aa3',      // YOUR DEPLOYED MOCKERC20 ON LOCALHOST
  },
  // --- Goerli Testnet (Chain ID: 5) ---
  5: {
    attestationService: '0xYourAttestationServiceAddressHere_Goerli',
    projectRegistry: '0xYourProjectRegistryAddressHere_Goerli',
    quadraticFunding: '0xYourQuadraticFundingAddressHere_Goerli',
    mockERC20: '0xYourMockERC20AddressHere_Goerli',
  },
  // --- Sepolia Testnet (Chain ID: 11155111) ---
  // AttestationService, ProjectRegistry, QuadraticFunding addresses filled here
  11155111: {
    attestationService: '0xBDAA0aeFf6c6D8c0Ab2383576536a47Da781d4E4', // YOUR ATTESTATION SERVICE
    projectRegistry: '0xa5d15129eCCbaD04125435AF9163ef0159afA6D7',    // YOUR PROJECT REGISTRY
    quadraticFunding: '0xd9f57b20Fa807F310001359B984E702f613Ca42c',   // YOUR QUADRATIC FUNDING
    mockERC20: '0xYourMockERC20AddressHere_Sepolia',                   // <<< YOU NEED TO DEPLOY MOCKERC20 TO SEPOLIA AND GET ITS ADDRESS
  },
  // Add more networks and their corresponding contract addresses as you deploy to them.
};

// 3. Construct the main contractConfig object for export
const contractConfig = {
  // Determine the current network ID. It checks for an environment variable first,
  // then defaults to '31337' (Hardhat Local) if the env var isn't set.
  // This helps your frontend connect to the correct contracts automatically.
  currentNetworkId: process.env.NEXT_PUBLIC_CHAIN_ID || process.env.REACT_APP_CHAIN_ID || '31337',

  // Configuration for AttestationService contract
  attestationService: {
    // Get the address for the current network from the CONTRACT_ADDRESSES object
    // The '?' (optional chaining) handles cases where an address might not be defined for a network
    address: CONTRACT_ADDRESSES[process.env.NEXT_PUBLIC_CHAIN_ID || process.env.REACT_APP_CHAIN_ID || '31337']?.attestationService,
    // Access the actual ABI array from the imported JSON
    abi: AttestationServiceABI.abi,
  },

  // Configuration for ProjectRegistry contract
  projectRegistry: {
    address: CONTRACT_ADDRESSES[process.env.NEXT_PUBLIC_CHAIN_ID || process.env.REACT_APP_CHAIN_ID || '31337']?.projectRegistry,
    abi: ProjectRegistryABI.abi, // Assuming ProjectRegistry.json also has ABI nested under '.abi'
  },

  // Configuration for QuadraticFunding contract
  quadraticFunding: {
    address: CONTRACT_ADDRESSES[process.env.NEXT_PUBLIC_CHAIN_ID || process.env.REACT_APP_CHAIN_ID || '31337']?.quadraticFunding,
    abi: QuadraticFundingABI.abi, // Assuming QuadraticFunding.json also has ABI nested under '.abi'
  },

  // Configuration for MockERC20 contract (your test token)
  mockERC20: {
    address: CONTRACT_ADDRESSES[process.env.NEXT_PUBLIC_CHAIN_ID || process.env.REACT_APP_CHAIN_ID || '31337']?.mockERC20,
    abi: MockERC20ABI.abi, // Assuming MockERC20.json also has ABI nested under '.abi'
  },
};

// Export the entire configuration object so other files can import it
export default contractConfig;