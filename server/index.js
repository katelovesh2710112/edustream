require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const { initiateDeveloperControlledWalletsClient } = require("@circle-fin/developer-controlled-wallets");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Configuration checks
const PRIVATE_KEY = process.env.PRIVATE_KEY; 
const ARC_RPC_URL = "https://rpc.testnet.arc.network";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

// ABI snippet for USDC ERC-20 transfer
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

// ABI snippet for SoulboundCert minting
const SBT_ABI = [
  "function mintCertificate(address student, uint256 courseId, string memory courseName, string memory tokenURI) external returns (uint256)"
];

// Active deployed contract addresses (filled by deployer, default placeholders for compile-safety)
const SOULBOUND_CERT_ADDRESS = process.env.SOULBOUND_CERT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Circle Developer-Controlled Wallets Configuration
let circleClient = null;
if (process.env.CIRCLE_API_KEY) {
  try {
    circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
    });
    console.log("Circle Developer-Controlled Wallets SDK initialized successfully.");
  } catch (error) {
    console.warn("Could not initialize Circle client. Falling back to Ethers EOA engine.", error.message);
  }
}

// In-memory quiz db (questions and answers for verification)
const QUIZZES = {
  1: { // Course 1: App Kits Developer Office Hours
    questions: [
      { id: 1, text: "What is Arc L1's native gas?", options: { A: "ETH", B: "USDC" }, correctAnswer: "B" },
      { id: 2, text: "What is CCTP's domain ID for Arc?", options: { A: "26", B: "0" }, correctAnswer: "A" },
      { id: 3, text: "What are the decimals of USDC ERC20?", options: { A: "18", C: "6" }, correctAnswer: "C" }
    ],
    rewardAmount: "5.00", // 5 USDC
    courseName: "App Kits Developer Office Hours"
  },
  2: { // Course 2: Using Circle Developer Controlled Wallets
    questions: [
      { id: 1, text: "What revenue percentage splits directly to Course Co-Investors?", options: { A: "3%", B: "20%", C: "77%" }, correctAnswer: "B" },
      { id: 2, text: "Which algorithm ensures loop-free co-invest distributions on-chain?", options: { A: "Superfluid Flow", B: "Sablier Streams", C: "Accumulated Revenue Per Share" }, correctAnswer: "C" },
      { id: 3, text: "What happens if a crowdfunding goal is NOT reached by the deadline?", options: { A: "Funds are locked", B: "Funds are refunded to investors", C: "Funds go to the platform" }, correctAnswer: "B" }
    ],
    rewardAmount: "10.00", // 10 USDC
    courseName: "Using Circle Developer Controlled Wallets to Send and Manage USDC"
  },
  3: { // Course 3: Event Replay: Day One Architect: Para
    questions: [
      { id: 1, text: "Can a student transfer their completed course Soulbound Certificate?", options: { A: "Yes, at any time", B: "No, transfers always revert", C: "Only with admin approval" }, correctAnswer: "B" },
      { id: 2, text: "How many decimals do native gas calculations use on Arc Testnet?", options: { A: "6", B: "18", C: "8" }, correctAnswer: "B" },
      { id: 3, text: "Which ERC standard serves as the foundation for our Soulbound Cert?", options: { A: "ERC-20", B: "ERC-721Storage", C: "ERC-1155" }, correctAnswer: "B" }
    ],
    rewardAmount: "15.00", // 15 USDC
    courseName: "Event Replay: Day One Architect: Para"
  }
};

// Route: Get all quizzes
app.get("/api/quizzes", (req, res) => {
  res.json(QUIZZES);
});

// Route: Status API
app.get("/api/status", async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
    let rewardPoolBalance = "0.0";
    let adminAddress = "N/A";

    if (PRIVATE_KEY) {
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      adminAddress = wallet.address;
      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
      try {
        const bal = await usdcContract.balanceOf(wallet.address);
        rewardPoolBalance = ethers.formatUnits(bal, 6);
      } catch (err) {
        rewardPoolBalance = "Error reading balance";
      }
    }

    res.json({
      status: "ONLINE",
      blockchain: "Arc Testnet",
      chainId: 5042002,
      usdcToken: USDC_ADDRESS,
      sbtContract: SOULBOUND_CERT_ADDRESS,
      adminAddress: adminAddress,
      rewardPoolBalance: rewardPoolBalance,
      circleIntegration: circleClient ? "ENABLED" : "FALLBACK_EOA_ACTIVE"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route: Verify Quiz and Payout L2E Reward + Mint SBT Certificate
app.post("/api/verify-quiz", async (req, res) => {
  const { studentAddress, quizId, answers } = req.body;

  console.log(`[QUIZ] Received submission from ${studentAddress} for quiz ${quizId}`);

  if (!studentAddress || !quizId || !answers) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const quiz = QUIZZES[quizId];
  if (!quiz) {
    return res.status(404).json({ error: "Quiz not found" });
  }

  // 1. Verify answers
  let score = 0;
  quiz.questions.forEach((q) => {
    if (answers[q.id] === q.correctAnswer) {
      score++;
    }
  });

  const passed = score === quiz.questions.length;
  if (!passed) {
    return res.json({
      success: false,
      score: score,
      total: quiz.questions.length,
      message: "You must score 100% to qualify for the stablecoin reward."
    });
  }

  console.log(`[QUIZ] student ${studentAddress} passed quiz ${quizId}! Initiating reward payout.`);

  let rewardTxHash = null;
  let sbtTxHash = null;

  try {
    // 2. Distribute USDC Reward (Circle DCW or Fallback EOA)
    if (circleClient && process.env.CIRCLE_DEVELOPER_WALLET_ID) {
      console.log("[PAYOUT] Routing via Circle Developer-Controlled Wallets API");
      try {
        const response = await circleClient.createTransaction({
          walletId: process.env.CIRCLE_DEVELOPER_WALLET_ID,
          destinationAddress: studentAddress,
          amounts: [quiz.rewardAmount],
          feeLevel: "MEDIUM",
          tokenId: USDC_ADDRESS,
          blockchain: "ETH-ARC-TESTNET" // Identifier for Arc Testnet on Circle Developer platform
        });
        rewardTxHash = response.data.transaction.txHash || "Circle tx pending";
        console.log("[PAYOUT] Circle payment submitted:", rewardTxHash);
      } catch (circleErr) {
        console.error("[PAYOUT] Circle payment failed, attempting Ethers EOA fallback:", circleErr.message);
      }
    }

    // Fallback Ethers EOA transfer if Circle is not available or failed
    if (!rewardTxHash) {
      if (!PRIVATE_KEY) {
        throw new Error("No private key configured for fallback USDC payout.");
      }
      console.log("[PAYOUT] Executing onchain transfer using EOA Admin wallet");
      const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
      
      // Amount in 6 decimals
      const amountParsed = ethers.parseUnits(quiz.rewardAmount, 6);
      
      // Execute the ERC20 transfer on Arc Testnet
      const tx = await usdcContract.transfer(studentAddress, amountParsed);
      await tx.wait();
      rewardTxHash = tx.hash;
      console.log("[PAYOUT] Onchain reward payment successful. Hash:", rewardTxHash);
    }

    // 3. Programmatically Mint Soulbound Certificate NFT
    if (SOULBOUND_CERT_ADDRESS !== "0x0000000000000000000000000000000000000000" && PRIVATE_KEY) {
      console.log("[SBT] Minting Soulbound Completion Certificate");
      const provider = new ethers.JsonRpcProvider(ARC_RPC_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      const sbtContract = new ethers.Contract(SOULBOUND_CERT_ADDRESS, SBT_ABI, wallet);

      // Metadata JSON for the Soulbound Certificate
      const tokenURI = JSON.stringify({
        name: `Certificate of Completion: ${quiz.courseName}`,
        description: `This Soulbound NFT certifies that the address ${studentAddress} has successfully completed the course on EduStream.`,
        courseId: quizId,
        student: studentAddress,
        platform: "EduStream Pay-As-You-Learn Platform",
        blockchain: "Arc Testnet"
      });

      const sbtTx = await sbtContract.mintCertificate(studentAddress, quizId, quiz.courseName, tokenURI);
      await sbtTx.wait();
      sbtTxHash = sbtTx.hash;
      console.log("[SBT] Soulbound Certificate minted. Hash:", sbtTxHash);
    }

    res.json({
      success: true,
      score: score,
      total: quiz.questions.length,
      rewardAmount: quiz.rewardAmount,
      rewardTxHash: rewardTxHash,
      sbtTxHash: sbtTxHash,
      message: `Congratulations! You received ${quiz.rewardAmount} USDC and your Soulbound Completion NFT!`
    });

  } catch (error) {
    console.error("[ERROR] Reward distribution failed:", error);
    res.status(500).json({
      error: "Error processing on-chain rewards.",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`EduStream L2E server running on http://localhost:${PORT}`);
});
