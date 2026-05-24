import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arcTestnet } from 'viem/chains';
import { http } from 'wagmi';

// We configure RainbowKit + wagmi with Arc Testnet
export const config = getDefaultConfig({
  appName: 'EduStream Platform',
  projectId: '8dbb69bbbf4947cb9311a5133e69f584', // Valid 32-character hex ID (derived from session uuid)
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
  },
  ssr: false,
});

// Arc Testnet USDC contract address
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

// Active deployed contracts
export const COURSE_FUND_ADDRESS = "0x09db3acc9338374390B19CBA57C14Ba3E157C686"; 
export const EDU_STREAMER_ADDRESS = "0x9Cc210a5cACeE32536558c3cb1429839F6edaF72";
export const SOULBOUND_CERT_ADDRESS = "0xC2ca8c8De4eaF237750a3560d99758A334109944";

export const L2E_SERVER_URL = "http://localhost:3001";

// ABI Definitions
export const USDC_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "_owner", "type": "address" },
      { "name": "_spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "remaining", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  }
] as const;

export const EDU_STREAMER_ABI = [
  {
    "inputs": [
      { "name": "_amount", "type": "uint256" }
    ],
    "name": "depositUSDC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_amount", "type": "uint256" }
    ],
    "name": "withdrawUSDC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_student", "type": "address" },
      { "name": "_courseId", "type": "uint256" },
      { "name": "_secondsStreamed", "type": "uint256" }
    ],
    "name": "settleStream",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawInstructorAccrued",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "student", "type": "address" }
    ],
    "name": "studentDeposits",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "instructor", "type": "address" }
    ],
    "name": "instructorBalances",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "courseId", "type": "uint256" }
    ],
    "name": "courses",
    "outputs": [
      { "name": "id", "type": "uint256" },
      { "name": "instructor", "type": "address" },
      { "name": "ratePerSecond", "type": "uint256" },
      { "name": "coInvested", "type": "bool" },
      { "name": "coInvestmentContract", "type": "address" },
      { "name": "active", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_courseId", "type": "uint256" },
      { "name": "_instructor", "type": "address" },
      { "name": "_ratePerSecond", "type": "uint256" },
      { "name": "_coInvested", "type": "bool" },
      { "name": "_coInvestmentContract", "type": "address" }
    ],
    "name": "registerCourse",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const COURSE_FUND_ABI = [
  {
    "inputs": [
      { "name": "_courseId", "type": "uint256" },
      { "name": "_instructor", "type": "address" },
      { "name": "_fundingGoal", "type": "uint256" },
      { "name": "_durationSeconds", "type": "uint256" }
    ],
    "name": "createCampaign",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_campaignId", "type": "uint256" },
      { "name": "_amount", "type": "uint256" }
    ],
    "name": "invest",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_campaignId", "type": "uint256" }
    ],
    "name": "refund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_campaignId", "type": "uint256" }
    ],
    "name": "claimFundingCapital",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_campaignId", "type": "uint256" }
    ],
    "name": "claimRevenueShare",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_campaignId", "type": "uint256" },
      { "name": "_investor", "type": "address" }
    ],
    "name": "getPendingRevenue",
    "outputs": [
      { "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "campaignId", "type": "uint256" }
    ],
    "name": "campaigns",
    "outputs": [
      { "name": "id", "type": "uint256" },
      { "name": "courseId", "type": "uint256" },
      { "name": "instructor", "type": "address" },
      { "name": "fundingGoal", "type": "uint256" },
      { "name": "totalInvested", "type": "uint256" },
      { "name": "deadline", "type": "uint256" },
      { "name": "fundingClaimed", "type": "bool" },
      { "name": "finalized", "type": "bool" },
      { "name": "accumulatedRevPerShare", "type": "uint256" },
      { "name": "totalShares", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const SOULBOUND_CERT_ABI = [
  {
    "inputs": [
      { "name": "_student", "type": "address" },
      { "name": "_courseId", "type": "uint256" }
    ],
    "name": "hasCertificate",
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
