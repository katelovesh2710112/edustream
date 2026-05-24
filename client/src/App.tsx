import { useState, useEffect, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  useAccount, 
  useReadContract, 
  useWriteContract,
  useWalletClient,
  usePublicClient
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { ViemAdapter } from '@circle-fin/adapter-viem-v2';
import { AppKit } from '@circle-fin/app-kit';
import { arcTestnet } from 'viem/chains';
import { 
  USDC_ADDRESS, 
  USDC_ABI, 
  EDU_STREAMER_ADDRESS, 
  EDU_STREAMER_ABI, 
  COURSE_FUND_ADDRESS, 
  COURSE_FUND_ABI, 
  SOULBOUND_CERT_ADDRESS, 
  SOULBOUND_CERT_ABI, 
  L2E_SERVER_URL 
} from './config';
import { 
  TransferIcon, 
  SponsorIcon, 
  RocketIcon, 
  HelpIcon, 
  DiplomaIcon, 
  FlashIcon, 
  ScrollIcon, 
  ShieldIcon, 
  BulbIcon, 
  TrophyIcon, 
  PlayStreamIcon, 
  ClockStreamIcon 
} from './components/Icons';

export default function App() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Core App Tabs
  const [activeTab, setActiveTab] = useState<'learn' | 'invest' | 'profile' | 'creator'>('learn');
  const [showWalkthrough, setShowWalkthrough] = useState<boolean>(true);
  const [activeHelpTopic, setActiveHelpTopic] = useState<string | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<number>(1);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [quizzesList, setQuizzesList] = useState<any>(null);

  // Video Streaming & Auto-Settle
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [secondsStreamed, setSecondsStreamed] = useState<number>(0);
  const [accruedCost, setAccruedCost] = useState<number>(0);
  const [isSettling, setIsSettling] = useState<boolean>(false);
  const [isAutoSettleEnabled, setIsAutoSettleEnabled] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Quiz Responses
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState<boolean>(false);

  // Co-Investment
  const [investAmount, setInvestAmount] = useState<string>('');
  const [isInvesting, setIsInvesting] = useState<boolean>(false);

  // Creator Studio Form
  const [newCourseId, setNewCourseId] = useState<string>('2');
  const [newCourseName, setNewCourseName] = useState<string>('');
  const [newCourseRate, setNewCourseRate] = useState<string>('3.6'); // USDC/Hour
  const [newFundingGoal, setNewFundingGoal] = useState<string>('100'); // USDC Goal
  const [newFundingDuration, setNewFundingDuration] = useState<string>('86400'); // Goal Duration (1 day)
  const [isCreatingCourse, setIsCreatingCourse] = useState<boolean>(false);

  // Peer-to-Peer Circle App Kit Gateway
  const [circleRecipient, setCircleRecipient] = useState<string>('');
  const [circleAmount, setCircleAmount] = useState<string>('');
  const [circleTxHash, setCircleTxHash] = useState<string>('');
  const [isCircleSending, setIsCircleSending] = useState<boolean>(false);

  // Premium Custom Modal Notification State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type
    });
  };

  // ================= ONCHAIN READS =================

  // Global user learning deposit
  const { data: studentDeposit, refetch: refetchDeposit } = useReadContract({
    address: EDU_STREAMER_ADDRESS,
    abi: EDU_STREAMER_ABI,
    functionName: 'studentDeposits',
    args: address ? [address] : undefined,
  });

  // Global wallet USDC balance
  const { data: usdcBalance, refetch: refetchUSDC } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Dynamic Course Details on-chain
  const { data: courseOnChain, refetch: refetchCourseOnChain } = useReadContract({
    address: EDU_STREAMER_ADDRESS,
    abi: EDU_STREAMER_ABI,
    functionName: 'courses',
    args: [BigInt(activeCourseId)],
  });

  // Crowdfund Campaign details for the active course
  const { data: campaignDetails, refetch: refetchCampaign } = useReadContract({
    address: COURSE_FUND_ADDRESS,
    abi: COURSE_FUND_ABI,
    functionName: 'campaigns',
    args: [BigInt(activeCourseId)],
  });

  // Accrued revenue split for investor
  const { data: pendingRevenue, refetch: refetchRevenue } = useReadContract({
    address: COURSE_FUND_ADDRESS,
    abi: COURSE_FUND_ABI,
    functionName: 'getPendingRevenue',
    args: address ? [BigInt(activeCourseId), address] : undefined,
  });

  // Student completion SBT
  const { data: hasCert, refetch: refetchCert } = useReadContract({
    address: SOULBOUND_CERT_ADDRESS,
    abi: SOULBOUND_CERT_ABI,
    functionName: 'hasCertificate',
    args: address ? [address, BigInt(activeCourseId)] : undefined,
  });

  // Instructor earnings for the logged creator
  const { data: creatorEarnings, refetch: refetchCreatorEarnings } = useReadContract({
    address: EDU_STREAMER_ADDRESS,
    abi: EDU_STREAMER_ABI,
    functionName: 'instructorBalances',
    args: address ? [address] : undefined,
  });

  // Dynamic Rate per Second calculated directly from contract mapping
  const ratePerSecond = courseOnChain && (courseOnChain as any)[2] > 0n ? (courseOnChain as any)[2] : 1000n;
  const RATE_DISPLAY = Number(formatUnits(ratePerSecond as bigint, 6));

  // ================= SIDE EFFECTS =================

  // Poll server status & load dynamic quizzes
  useEffect(() => {
    fetch(`${L2E_SERVER_URL}/api/status`)
      .then((res) => res.json())
      .then((data) => setServerStatus(data))
      .catch((err) => console.log("L2E Backend server offline", err));

    fetch(`${L2E_SERVER_URL}/api/quizzes`)
      .then((res) => res.json())
      .then((data) => setQuizzesList(data))
      .catch((err) => console.log("Failed to load quizzes", err));
  }, []);

  // Streaming Timer logic with dynamic speed & background auto-settle trigger
  useEffect(() => {
    if (isStreaming) {
      timerRef.current = setInterval(() => {
        setSecondsStreamed((prev) => {
          const nextSecs = prev + 1;
          setAccruedCost(nextSecs * RATE_DISPLAY);

          // Auto-Settle trigger: every 15 seconds in the background
          if (isAutoSettleEnabled && nextSecs > 0 && nextSecs % 15 === 0) {
            handleBackgroundSettle();
          }

          return nextSecs;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => clearInterval(timerRef.current);
  }, [isStreaming, isAutoSettleEnabled, RATE_DISPLAY]);

  // Refetch data when switching courses
  useEffect(() => {
    refetchCourseOnChain();
    refetchCampaign();
    refetchRevenue();
    refetchCert();
  }, [activeCourseId]);

  // ================= USER FLOW INTERACTIONS =================

  // Action: Deposit USDC to Streamer contract
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    try {
      const parsedAmount = parseUnits(depositAmount, 6);
      
      // 1. Approve USDC first
      console.log("Approving USDC to EduStreamer...");
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [EDU_STREAMER_ADDRESS, parsedAmount],
      });

      // 2. Call depositUSDC
      console.log("Depositing USDC...");
      await writeContractAsync({
        address: EDU_STREAMER_ADDRESS,
        abi: EDU_STREAMER_ABI,
        functionName: 'depositUSDC',
        args: [parsedAmount],
      });
      
      showModal("Deposit Successful", `Successfully allocated ${depositAmount} USDC study budget inside your classroom!`, "success");
      setDepositAmount('');
      refetchDeposit();
      refetchUSDC();
    } catch (error: any) {
      console.error(error);
      showModal("Deposit Failed", error.message, "error");
    }
  };

  // Action: Withdraw USDC from Streamer contract
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    try {
      const parsedAmount = parseUnits(withdrawAmount, 6);
      console.log("Withdrawing USDC from EduStreamer...");
      await writeContractAsync({
        address: EDU_STREAMER_ADDRESS,
        abi: EDU_STREAMER_ABI,
        functionName: 'withdrawUSDC',
        args: [parsedAmount],
      });
      showModal("Withdrawal Successful", `Withdrew ${withdrawAmount} USDC study budget back to your standard wallet!`, "success");
      setWithdrawAmount('');
      refetchDeposit();
      refetchUSDC();
    } catch (error: any) {
      console.error(error);
      showModal("Withdrawal Failed", error.message, "error");
    }
  };

  // Action: Settle stream on-chain (Feature A)
  const handleSettleStream = async () => {
    if (secondsStreamed <= 0) return;
    setIsSettling(true);
    try {
      console.log(`Settling stream of ${secondsStreamed} seconds on-chain...`);
      const tx = await writeContractAsync({
        address: EDU_STREAMER_ADDRESS,
        abi: EDU_STREAMER_ABI,
        functionName: 'settleStream',
        args: [address!, BigInt(activeCourseId), BigInt(secondsStreamed)],
      });
      console.log("Settle Tx Hash:", tx);
      showModal("Study Progress Saved!", `Securely settled ${secondsStreamed} seconds on Arc Testnet. Transferred ${accruedCost.toFixed(5)} USDC to teacher and investors!`, "success");
      
      setIsStreaming(false);
      setSecondsStreamed(0);
      setAccruedCost(0);
      refetchDeposit();
      refetchUSDC();
      refetchCreatorEarnings();
      refetchRevenue();
    } catch (error: any) {
      console.error(error);
      showModal("Settlement Failed", error.message, "error");
    } finally {
      setIsSettling(false);
    }
  };

  // Auto-Settle background payout call (secures funds block-by-block)
  const handleBackgroundSettle = async () => {
    try {
      console.log("[AUTO-SETTLE] Automatically writing 15-second lesson block to Arc Testnet...");
      await writeContractAsync({
        address: EDU_STREAMER_ADDRESS,
        abi: EDU_STREAMER_ABI,
        functionName: 'settleStream',
        args: [address!, BigInt(activeCourseId), BigInt(15)],
      });
      
      // Deduct 15s from accumulator so we don't double-charge
      setSecondsStreamed((s) => Math.max(0, s - 15));
      setAccruedCost((c) => Math.max(0, c - 15 * RATE_DISPLAY));
      refetchDeposit();
      refetchUSDC();
      refetchCreatorEarnings();
      refetchRevenue();
    } catch (err) {
      console.warn("[AUTO-SETTLE] Auto background settlement failed", err);
    }
  };

  // Action: Invest in Crowdfund campaign (Feature D)
  const handleInvest = async () => {
    if (!investAmount || parseFloat(investAmount) <= 0) return;
    setIsInvesting(true);
    try {
      const parsedAmount = parseUnits(investAmount, 6);

      // Approve USDC first
      console.log("Approving USDC for CourseFund...");
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [COURSE_FUND_ADDRESS, parsedAmount],
      });

      // Call invest()
      console.log("Investing in course fund...");
      await writeContractAsync({
        address: COURSE_FUND_ADDRESS,
        abi: COURSE_FUND_ABI,
        functionName: 'invest',
        args: [BigInt(activeCourseId), parsedAmount],
      });

      alert(`Successfully co-invested ${investAmount} USDC!`);
      setInvestAmount('');
      refetchCampaign();
      refetchUSDC();
      refetchRevenue();
    } catch (error: any) {
      console.error(error);
      alert("Investment failed: " + error.message);
    } finally {
      setIsInvesting(false);
    }
  };

  // Action: Claim co-investor revenue share
  const handleClaimRevenue = async () => {
    try {
      console.log("Claiming revenue share...");
      await writeContractAsync({
        address: COURSE_FUND_ADDRESS,
        abi: COURSE_FUND_ABI,
        functionName: 'claimRevenueShare',
        args: [BigInt(activeCourseId)],
      });
      alert("Accrued revenue claimed successfully!");
      refetchRevenue();
      refetchUSDC();
    } catch (error: any) {
      console.error(error);
      alert("Claim failed: " + error.message);
    }
  };

  // Action: Submit Quiz for L2E reward & SBT Certificate (Feature B & C)
  const handleQuizSubmit = async () => {
    const courseQuiz = quizzesList ? quizzesList[activeCourseId] : null;
    if (!courseQuiz) return;
    
    if (Object.keys(answers).length < courseQuiz.questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }
    setIsSubmittingQuiz(true);
    setQuizResult(null);

    try {
      const response = await fetch(`${L2E_SERVER_URL}/api/verify-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentAddress: address,
          quizId: activeCourseId,
          answers: answers
        })
      });

      const result = await response.json();
      setQuizResult(result);
      
      if (result.success) {
        refetchUSDC();
        refetchCert();
      }
    } catch (error: any) {
      console.error(error);
      showModal("Quiz Submission Failed", error.message, "error");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const selectAnswer = (questionId: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  // ================= TEACHER DASHBOARD CREATOR ACTIONS =================

  const handleCreateCourseAndCampaign = async () => {
    if (!newCourseId || !newCourseName || !newCourseRate || !newFundingGoal || !newFundingDuration) {
      showModal("Parameters Required", "Please fill in all course parameters!", "info");
      return;
    }
    setIsCreatingCourse(true);
    try {
      const parsedId = BigInt(newCourseId);
      const goalUSDC = parseUnits(newFundingGoal, 6);
      const durationSecs = BigInt(newFundingDuration);
      
      // Calculate rate: ratePerSec = (hourlyAmount * 1e6) / 3600
      const hourlyVal = parseFloat(newCourseRate);
      const ratePerSecVal = BigInt(Math.floor((hourlyVal * 1_000_000) / 3600));

      // 1. Create Crowdfunding Campaign
      console.log("[CREATOR] Creating campaign on CourseFund...");
      await writeContractAsync({
        address: COURSE_FUND_ADDRESS,
        abi: COURSE_FUND_ABI,
        functionName: 'createCampaign',
        args: [parsedId, address!, goalUSDC, durationSecs],
      });

      // 2. Register Course in Streamer linking the campaign
      console.log("[CREATOR] Registering course with Streamer...");
      await writeContractAsync({
        address: EDU_STREAMER_ADDRESS,
        abi: EDU_STREAMER_ABI,
        functionName: 'registerCourse',
        args: [parsedId, address!, ratePerSecVal, true, COURSE_FUND_ADDRESS],
      });

      showModal("Course Registered", `Course ${newCourseName} registered and Crowdfunding launched successfully!`, "success");
      refetchCourseOnChain();
      refetchCampaign();
      setActiveTab('learn');
    } catch (err: any) {
      console.error(err);
      showModal("Registration Failed", "Failed to create course campaign: " + err.message, "error");
    } finally {
      setIsCreatingCourse(false);
    }
  };

  // Action: Creator withdraws accumulated learning revenues
  const handleCreatorWithdraw = async () => {
    try {
      console.log("[CREATOR] Withdrawing accrued teacher earnings...");
      await writeContractAsync({
        address: EDU_STREAMER_ADDRESS,
        abi: EDU_STREAMER_ABI,
        functionName: 'withdrawInstructorAccrued',
      });
      showModal("Earnings Claimed", "Accrued creator earnings claimed to wallet!", "success");
      refetchCreatorEarnings();
      refetchUSDC();
    } catch (err: any) {
      console.error(err);
      showModal("Withdrawal Failed", err.message, "error");
    }
  };

  // Action: Creator claims capital raised during crowdfunding campaign
  const handleClaimCampaignCapital = async () => {
    try {
      console.log("[CREATOR] Claiming capital raised...");
      await writeContractAsync({
        address: COURSE_FUND_ADDRESS,
        abi: COURSE_FUND_ABI,
        functionName: 'claimFundingCapital',
        args: [BigInt(activeCourseId)],
      });
      showModal("Capital Claimed", "Campaign capital successfully pulled into creator wallet!", "success");
      refetchCampaign();
      refetchUSDC();
    } catch (err: any) {
      console.error(err);
      showModal("Claim Failed", err.message, "error");
    }
  };

  // ================= PEER SEND VIA CIRCLE APP KIT SDK =================

  const handleCircleSend = async () => {
    if (!circleRecipient || !circleAmount || parseFloat(circleAmount) <= 0) {
      showModal("Parameters Required", "Please specify a recipient wallet address and a valid transfer amount!", "info");
      return;
    }
    if (!walletClient || !publicClient) {
      showModal("Wallet Disconnected", "Wallet not fully connected. Check RainbowKit!", "error");
      return;
    }
    setIsCircleSending(true);
    setCircleTxHash('');
    try {
      console.log("[CIRCLE APP KIT] Initializing Viem v2 Adapter...");
      const adapter = new ViemAdapter({
        getPublicClient: () => publicClient as any,
        getWalletClient: () => walletClient as any,
      }, {
        addressContext: 'user-controlled',
        supportedChains: [arcTestnet as any],
      });

      console.log("[CIRCLE APP KIT] Initializing App Kit SDK...");
      const kit = new AppKit();

      console.log(`[CIRCLE APP KIT] Sending ${circleAmount} USDC on Arc Testnet via App Kit SDK...`);
      const result = await kit.send({
        from: { adapter, chain: "Arc_Testnet" },
        to: circleRecipient,
        amount: circleAmount,
        token: "USDC",
      });

      console.log("[CIRCLE APP KIT] Transfer response:", result);
      setCircleTxHash(result.txHash || 'Transaction submitted successfully.');
      showModal("Transfer Complete", `Sent ${circleAmount} USDC via Circle App Kit!`, "success");
      setCircleAmount('');
      setCircleRecipient('');
      refetchUSDC();
    } catch (err: any) {
      console.error("[CIRCLE APP KIT] App Kit sending failed, calling fallback Ethers write:", err);
      // Fallback Direct Ethers/wagmi write
      try {
        const parsed = parseUnits(circleAmount, 6);
        const tx = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: USDC_ABI,
          functionName: 'transfer',
          args: [circleRecipient, parsed],
        });
        setCircleTxHash(tx);
        showModal("Transfer Complete", `Successfully executed fallback transfer! Hash: ${tx}`, "success");
        setCircleAmount('');
        setCircleRecipient('');
        refetchUSDC();
      } catch (fallbackErr: any) {
        showModal("Transfer Failed", "Circle send and fallback transfer failed: " + fallbackErr.message, "error");
      }
    } finally {
      setIsCircleSending(false);
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* HEADER BAR */}
      <header className="glass-panel" style={{ margin: '20px', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="brand-font grad-text" style={{ fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
            EduStream
          </div>
          <span className="badge-stream" style={{ background: 'rgba(102, 252, 241, 0.1)', color: '#66fcf1', borderColor: 'rgba(102, 252, 241, 0.3)' }}>
            Superfast Network
          </span>
          {serverStatus && (
            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%' }}></span>
              Study Prize Pool Active ($10 USDC Cash Rewards Online)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <nav style={{ display: 'flex', gap: '25px', marginRight: '20px' }}>
            <span 
              onClick={() => setActiveTab('learn')} 
              style={{ cursor: 'pointer', fontWeight: 600, color: activeTab === 'learn' ? '#66fcf1' : '#9ca3af', transition: 'color 0.2s' }}
            >
              Learn & Watch
            </span>
            <span 
              onClick={() => setActiveTab('invest')} 
              style={{ cursor: 'pointer', fontWeight: 600, color: activeTab === 'invest' ? '#66fcf1' : '#9ca3af', transition: 'color 0.2s' }}
            >
              Sponsor & Earn
            </span>
            <span 
              onClick={() => setActiveTab('profile')} 
              style={{ cursor: 'pointer', fontWeight: 600, color: activeTab === 'profile' ? '#66fcf1' : '#9ca3af', transition: 'color 0.2s' }}
            >
              My Diplomas & Send
            </span>
            <span 
              onClick={() => setActiveTab('creator')} 
              style={{ cursor: 'pointer', fontWeight: 600, color: activeTab === 'creator' ? '#c5a059' : '#9ca3af', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <ShieldIcon size={14} color={activeTab === 'creator' ? 'var(--gold-accent)' : '#9ca3af'} /> Teacher Center
            </span>
          </nav>
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </header>

      {!isConnected ? (
        /* CONNECT CALL-TO-ACTION */
        <main className="glass-panel" style={{ maxWidth: '600px', margin: '100px auto', padding: '50px 30px', textAlign: 'center' }}>
          <h2 className="grad-text" style={{ fontSize: '2.2rem', marginBottom: '15px' }}>Pay-As-You-Watch Study Rooms</h2>
          <p style={{ color: '#9ca3af', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '30px' }}>
            Welcome to EduStream, the friendly platform where you only pay for the exact seconds of lessons you actually watch. Pre-fund a small study balance, learn at your own pace, complete quick quizzes to win real cash prizes, and collect permanent digital diplomas to showcase your skills.
          </p>
          <div style={{ display: 'inline-block' }}>
            <ConnectButton label="Enter Classroom" />
          </div>
        </main>
      ) : (
        /* CONNECTED MULTI-DASHBOARD */
        <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
          
          {/* TOP METRIC CARD HUD */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="glass-panel metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveHelpTopic('funding')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">My Funding Wallet</span>
                <span style={{ fontSize: '0.8rem', color: '#66fcf1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Help <HelpIcon size={12} color="var(--cyan-accent)" />
                </span>
              </div>
              <div className="metric-value" style={{ color: '#66fcf1', marginTop: '5px' }}>
                {usdcBalance ? (parseFloat(formatUnits(usdcBalance as bigint, 6)).toFixed(2)) : '0.00'} USDC
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '6px' }}>Available cash to fund your learning or withdraw</div>
            </div>

            <div className="glass-panel metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveHelpTopic('credit')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">Prepaid Study Credit</span>
                <span style={{ fontSize: '0.8rem', color: '#c5a059', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Help <HelpIcon size={12} color="var(--gold-accent)" />
                </span>
              </div>
              <div className="metric-value" style={{ color: '#c5a059', marginTop: '5px' }}>
                {studentDeposit ? (parseFloat(formatUnits(studentDeposit as bigint, 6)).toFixed(2)) : '0.00'} USDC
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '6px' }}>Budget loaded inside your active classroom</div>
            </div>

            <div className="glass-panel metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveHelpTopic('diploma')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="metric-label">My Digital Diplomas</span>
                <span style={{ fontSize: '0.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Help <HelpIcon size={12} color="#fff" />
                </span>
              </div>
              <div className="metric-value" style={{ marginTop: '5px' }}>
                {hasCert ? '1 Completed Diploma' : '0 Diplomas'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '6px' }}>Verifiable course completions on your profile</div>
            </div>
          </section>

          {/* SMART ONBOARDING WALKTHROUGH FLOW */}
          {showWalkthrough && (
            <div className="glass-panel" style={{ padding: '25px', marginBottom: '30px', border: '1px solid rgba(102, 252, 241, 0.2)', position: 'relative', background: 'linear-gradient(135deg, rgba(102, 252, 241, 0.05), rgba(0, 0, 0, 0.4))' }}>
              <button 
                onClick={() => setShowWalkthrough(false)}
                style={{ position: 'absolute', top: '15px', right: '20px', background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer' }}
                title="Dismiss Tour"
              >
                ✕
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <BulbIcon size={20} color="var(--cyan-accent)" glow={true} />
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#66fcf1', fontWeight: 600 }}>Interactive Quick-Start Guide</h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ background: '#66fcf1', color: '#0b0c10', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>1</span>
                    <strong style={{ fontSize: '0.9rem' }}>Load Study Credits</strong>
                  </div>
                  <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, lineHeight: '1.4' }}>
                    Click <strong>"Deposit"</strong> in the right panel to allocate a small study budget. Think of this like loading a prepaid transit card. Leftovers can be withdrawn instantly!
                  </p>
                </div>

                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ background: '#66fcf1', color: '#0b0c10', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>2</span>
                    <strong style={{ fontSize: '0.9rem' }}>Watch & Pay By The Second</strong>
                  </div>
                  <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, lineHeight: '1.4' }}>
                    Press <strong>"Play Lesson"</strong>. Small fractions of a cent stream to the teacher every second you watch. If you pause, all costs stop immediately!
                  </p>
                </div>

                <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ background: '#66fcf1', color: '#0b0c10', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>3</span>
                    <strong style={{ fontSize: '0.9rem' }}>Pass Quiz, Win Cash Prizes</strong>
                  </div>
                  <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, lineHeight: '1.4' }}>
                    Finish the video and answer the short quiz. Get 100% to instantly claim a cash reward and permanently stamp your digital diploma badge!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC PROGRESSIVE DISCLOSURE CONTEXT HELP */}
          {activeHelpTopic && (
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px', border: '1px solid rgba(197, 160, 89, 0.3)', background: 'rgba(197, 160, 89, 0.03)', position: 'relative' }}>
              <button 
                onClick={() => setActiveHelpTopic(null)}
                style={{ position: 'absolute', top: '12px', right: '15px', background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1rem', cursor: 'pointer' }}
              >
                ✕ Close
              </button>

              {activeHelpTopic === 'funding' && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#66fcf1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SponsorIcon size={18} color="var(--cyan-accent)" glow={true} /> About: My Funding Wallet
                  </h4>
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                    This shows the total USDC cash balance currently available in your standard browser wallet. You use these funds to buy/sell assets, sponsor classes, or top up your prepaid study balances.
                  </p>
                </div>
              )}

              {activeHelpTopic === 'credit' && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#c5a059', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TransferIcon size={18} color="var(--gold-accent)" glow={true} /> About: Prepaid Study Credit
                  </h4>
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                    This is your loaded study budget. Think of it like a prepaid highway toll pass or cellular plan. As you watch lessons, fractions of a penny are securely transferred directly to the creator. <strong>Leftover funds are never locked</strong> — you can withdraw them back to your wallet instantly with one click.
                  </p>
                </div>
              )}

              {activeHelpTopic === 'diploma' && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DiplomaIcon size={18} color="#fff" /> About: My Digital Diplomas
                  </h4>
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                    Verifiable diplomas awarded automatically when you score 100% on a course quiz. Stamped permanently on the blockchain, they represent non-transferable proof of your skills that anyone can verify instantly.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 1: LEARN & STREAM PANEL ================= */}
          {activeTab === 'learn' && (
            <div>
              {/* Dynamic Course Pill Selectors */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '25px' }}>
                {[1, 2, 3].map((cid) => (
                  <button 
                    key={cid} 
                    className={activeCourseId === cid ? "neon-btn" : "solid-btn"}
                    style={{ padding: '10px 20px', fontSize: '0.9rem', flex: 1, textTransform: 'none' }}
                    onClick={() => {
                      setActiveCourseId(cid);
                      setAnswers({});
                      setQuizResult(null);
                    }}
                  >
                    Course {cid}: {cid === 1 ? "Circle App Kits" : cid === 2 ? "Circle DCWs" : "Architect: Para"}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '30px' }}>
                {/* VIDEO STREAMER VIEW */}
                <div className={`glass-panel ${isStreaming ? 'streaming-glow' : ''}`} style={{ padding: '30px' }}>
                  <h3 style={{ marginTop: 0, fontSize: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      Course {activeCourseId}: {
                        activeCourseId === 1 ? "App Kits Developer Office Hours" : 
                        activeCourseId === 2 ? "Using Circle Developer Controlled Wallets" : 
                        "Event Replay: Day One Architect: Para"
                      }
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#c5a059', fontWeight: 500, background: 'rgba(197, 160, 89, 0.08)', padding: '5px 12px', borderRadius: '15px', border: '1px solid rgba(197, 160, 89, 0.2)' }}>
                      Cost: {(RATE_DISPLAY * 3600).toFixed(2)} USDC / Hour (Only $0.001 / sec)
                    </span>
                  </h3>

                  <div className="video-wrapper" style={{ margin: '20px 0', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                    {isStreaming && (
                      <div className="stream-overlay" style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.85)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(102, 252, 241, 0.3)' }}>
                        <span className="stream-dot active"></span>
                        <span>{isAutoSettleEnabled ? '📚 AUTO-LEARNING ACTIVE' : '📚 STUDY ROOM ACTIVE'}: {accruedCost.toFixed(5)} USDC Streamed</span>
                      </div>
                    )}

                    {isStreaming ? (
                      <iframe 
                        key={activeCourseId}
                        src={
                          activeCourseId === 1 
                            ? "https://fast.wistia.net/embed/iframe/t7xrh2ahgt?autoplay=1" 
                            : activeCourseId === 2 
                            ? "https://fast.wistia.net/embed/iframe/15ltd09v76?autoplay=1" 
                            : "https://fast.wistia.net/embed/iframe/71b2z58o92?autoplay=1"
                        }
                        title="Course Video"
                        allow="autoplay; fullscreen"
                        frameBorder="0"
                        width="100%"
                        height="340px"
                        style={{ 
                          borderRadius: '12px', 
                          border: '1px solid rgba(102, 252, 241, 0.3)',
                          boxShadow: '0 0 20px rgba(102, 252, 241, 0.15)'
                        }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
                          <ScrollIcon size={64} color="var(--cyan-accent)" className="floating-slow" />
                        </div>
                        <h4 style={{ margin: '5px 0', fontSize: '1.25rem' }}>Study Session Paused</h4>
                        <p style={{ color: '#9ca3af', fontSize: '0.85rem', maxWidth: '380px', margin: '8px auto 0 auto', lineHeight: '1.4' }}>
                          Click <strong>"Play Lesson"</strong> below to resume. You only pay for what you watch, down to the exact second. Leftover balances are instantly refundable.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Player controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '15px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      {!isStreaming ? (
                        <button 
                          className="solid-btn" 
                          onClick={() => {
                            if (studentDeposit && (studentDeposit as bigint) > 0n) {
                              setIsStreaming(true);
                            } else {
                              showModal("Prepaid Credit Required", "Please add a little Prepaid Study Credit first in the right-hand panel before starting your study room session!", "info");
                            }
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          Play Lesson <PlayStreamIcon size={14} color="#05070a" />
                        </button>
                      ) : (
                        <button className="neon-btn" onClick={() => setIsStreaming(false)}>
                          Pause Lesson
                        </button>
                      )}

                      {secondsStreamed > 0 && (
                        <button 
                          className="solid-btn" 
                          style={{ background: '#ef4444', color: '#fff', boxShadow: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={handleSettleStream}
                          disabled={isSettling}
                        >
                          {isSettling ? 'Saving Progress...' : 'Save Learning Progress'}
                          <TrophyIcon size={14} color="#fff" />
                        </button>
                      )}

                      {/* Auto-Settle Mode Toggle */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#9ca3af', userSelect: 'none' }}>
                        <input 
                          type="checkbox" 
                          checked={isAutoSettleEnabled}
                          onChange={(e) => setIsAutoSettleEnabled(e.target.checked)}
                          style={{ accentColor: '#66fcf1' }}
                        />
                        <span>Auto-Save Progress (Every 15s)</span>
                      </label>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                        <ClockStreamIcon size={14} color="var(--text-muted)" /> Time Watched: {secondsStreamed}s
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#66fcf1', marginTop: '3px' }}>
                        Pending Cost: {accruedCost.toFixed(5)} USDC
                      </div>
                    </div>
                  </div>

                  {/* Safety / reassurance UI */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(102, 252, 241, 0.03)', padding: '10px 15px', borderRadius: '8px', border: '1px solid rgba(102, 252, 241, 0.08)' }}>
                    <ShieldIcon size={14} color="var(--cyan-accent)" />
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      <strong>Peace of Mind Guarantee:</strong> Your funds remain in your custody. Costs stop the exact millisecond you pause. Leftover credits can be refunded to your wallet at any time instantly.
                    </span>
                  </div>
                </div>

                {/* RIGHT LEARN TAB SIDEBAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  
                  {/* Fund Allocation Box */}
                  <div className="glass-panel" style={{ padding: '25px' }}>
                    <h4 style={{ marginTop: 0, fontSize: '1.2rem', color: '#66fcf1' }}>Study Balance Center</h4>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '20px' }}>
                      Add credits using stablecoins to start watching premium classes. You can withdraw your leftover balance back to your wallet at any time instantly.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <input 
                        type="number" 
                        placeholder="Amount in USDC" 
                        value={depositAmount} 
                        onChange={(e) => setDepositAmount(e.target.value)}
                        style={{ 
                          flex: 1, 
                          background: 'rgba(0,0,0,0.3)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '20px', 
                          padding: '10px 15px', 
                          color: '#fff',
                          outline: 'none' 
                        }}
                      />
                      <button className="neon-btn" onClick={handleDeposit}>Load Study Credits</button>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <input 
                        type="number" 
                        placeholder="Amount in USDC" 
                        value={withdrawAmount} 
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        style={{ 
                          flex: 1, 
                          background: 'rgba(0,0,0,0.3)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '20px', 
                          padding: '10px 15px', 
                          color: '#fff',
                          outline: 'none' 
                        }}
                      />
                      <button className="neon-btn" style={{ borderColor: '#c5a059', color: '#c5a059' }} onClick={handleWithdraw}>Withdraw Leftovers</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BulbIcon size={14} color="var(--cyan-accent)" /> <strong>What happens next:</strong> Credits are only used as you learn. Pause the video, and leftover balances remain 100% yours to withdraw instantly.
                      </span>
                    </div>
                  </div>

                  {/* L2E Interactive Quiz Panel */}
                  <div className="glass-panel" style={{ padding: '25px' }}>
                    {quizzesList && quizzesList[activeCourseId] ? (
                      <div>
                        <h4 style={{ marginTop: 0, fontSize: '1.2rem', color: '#66fcf1' }}>
                          Graduation Quiz: Win {quizzesList[activeCourseId].rewardAmount} USDC!
                        </h4>
                        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '20px', lineHeight: '1.4' }}>
                          Answer all questions correctly! The automated study validator will instantly dispatch your USD cash reward to your wallet and stamp your permanent digital diploma on your profile.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                          {quizzesList[activeCourseId].questions.map((q: any) => (
                            <div key={q.id}>
                              <div style={{ fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>{q.id}. {q.text}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(q.options).map(([key, val]: any) => (
                                  <div 
                                    key={key}
                                    className={`quiz-option ${answers[q.id] === key ? 'selected' : ''}`}
                                    onClick={() => selectAnswer(q.id, key)}
                                    style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: answers[q.id] === key ? 'rgba(102, 252, 241, 0.1)' : 'rgba(255,255,255,0.03)', border: answers[q.id] === key ? '1px solid #66fcf1' : '1px solid rgba(255,255,255,0.05)' }}
                                  >
                                    <span className="option-letter" style={{ background: answers[q.id] === key ? '#66fcf1' : 'rgba(255,255,255,0.1)', color: answers[q.id] === key ? '#0b0c10' : '#fff', borderRadius: '4px', padding: '2px 6px', marginRight: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>{key}</span> <span>{val}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button 
                          className="solid-btn" 
                          style={{ width: '100%' }}
                          onClick={handleQuizSubmit}
                          disabled={isSubmittingQuiz}
                        >
                          {isSubmittingQuiz ? 'Validator Grading Answers...' : 'Verify Graduation & Claim Reward'}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', marginTop: '10px' }}>
                          <span style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <BulbIcon size={14} color="var(--cyan-accent)" /> <strong>What happens next:</strong> The grading is instant. If you score less than 100%, you can study and try again for free!
                          </span>
                        </div>

                        {quizResult && (
                          <div style={{ 
                            marginTop: '20px', 
                            padding: '15px', 
                            borderRadius: '10px', 
                            background: quizResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${quizResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                          }}>
                            <div style={{ fontWeight: 'bold', color: quizResult.success ? '#10b981' : '#ef4444', marginBottom: '6px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {quizResult.success ? <TrophyIcon size={16} color="#10b981" /> : '❌'} 
                              {quizResult.success ? 'Congratulations! Graduate Approved' : 'Keep Studying! Retries are Free'}
                            </div>
                            <div style={{ fontSize: '0.85rem', lineHeight: '1.4', color: '#d1d5db' }}>
                              {quizResult.message}
                            </div>
                            {quizResult.success && (
                              <div style={{ marginTop: '12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#9ca3af' }}>USD Cash Prize:</span> 
                                  <a href={`https://testnet.arcscan.app/tx/${quizResult.rewardTxHash}`} target="_blank" style={{ color: '#66fcf1', fontWeight: 600 }}>Sent (View Receipt ↗)</a>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#9ca3af' }}>Verifiable Digital Diploma:</span> 
                                  <a href={`https://testnet.arcscan.app/tx/${quizResult.sbtTxHash}`} target="_blank" style={{ color: '#66fcf1', fontWeight: 600 }}>Stamped (View Mint ↗)</a>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' }}>
                        Connect to backend router to load interactive quizzes...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: COURSE CO-INVESTMENT CROWDFUNDING ================= */}
          {activeTab === 'invest' && (
            <div className="glass-panel" style={{ padding: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '30px', marginBottom: '30px' }}>
                <div>
                  <span className="badge-stream" style={{ background: 'rgba(197, 160, 89, 0.1)', color: '#c5a059', borderColor: '#c5a059', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <FlashIcon size={12} color="var(--gold-accent)" /> Creator Sponsorship Active
                  </span>
                  <h2 style={{ margin: '10px 0 5px 0', fontSize: '2rem' }}>
                    Sponsor Course {activeCourseId}: Help Creators, Earn Royalties
                  </h2>
                  <p style={{ color: '#9ca3af', maxWidth: '700px', margin: 0, fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Help instructors cover production costs for their new educational series. In return, you will automatically receive a permanent **20% share** of all seconds-based learning fees paid by future students who watch this course. This royalty split is programmed to pay you in real-time.
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Sponsor Royalty Rate</div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#66fcf1' }}>20.0%</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
                {/* CAMPAIGN STATISTICS */}
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                    <div className="metric-card" style={{ background: 'rgba(0,0,0,0.1)' }}>
                      <div className="metric-label">Campaign Goal</div>
                      <div className="metric-value">
                        {campaignDetails ? parseFloat(formatUnits((campaignDetails as any)[3], 6)).toFixed(0) : '100'} USDC
                      </div>
                    </div>

                    <div className="metric-card" style={{ background: 'rgba(0,0,0,0.1)' }}>
                      <div className="metric-label">Total Funded So Far</div>
                      <div className="metric-value" style={{ color: '#10b981' }}>
                        {campaignDetails ? parseFloat(formatUnits((campaignDetails as any)[4], 6)).toFixed(2) : '0.00'} USDC
                      </div>
                    </div>
                  </div>

                  <h4 style={{ margin: '0 0 10px 0' }}>How Funds Are Shared</h4>
                  <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span>Sponsor Royalties (Paid in real-time)</span>
                      <span style={{ fontWeight: 'bold', color: '#66fcf1' }}>20%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span>Teacher/Instructor Share</span>
                      <span style={{ fontWeight: 'bold' }}>77%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Platform Maintenance Fee</span>
                      <span style={{ fontWeight: 'bold' }}>3%</span>
                    </div>
                  </div>

                  <div className="metric-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="metric-label">My Accrued Royalties</div>
                      <div className="metric-value" style={{ color: '#c5a059', fontSize: '1.6rem' }}>
                        {pendingRevenue ? parseFloat(formatUnits(pendingRevenue as bigint, 6)).toFixed(6) : '0.000000'} USDC
                      </div>
                    </div>
                    <button 
                      className="solid-btn"
                      onClick={handleClaimRevenue}
                      style={{ background: '#c5a059', color: '#0b0c10', fontWeight: 'bold' }}
                      disabled={!pendingRevenue || (pendingRevenue as bigint) === 0n}
                    >
                      Withdraw My Royalties
                    </button>
                  </div>
                </div>

                {/* INVEST CONTROLLER */}
                <div className="glass-panel" style={{ padding: '30px', background: 'rgba(0,0,0,0.2)' }}>
                  <h3 style={{ marginTop: 0, fontSize: '1.3rem', color: '#66fcf1' }}>Sponsor This Course</h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '20px' }}>
                    Support the creator with your USDC cash. Once the campaign goal is achieved, you will automatically start earning a 20% royalty share from future student study fees.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                    <input 
                      type="number" 
                      placeholder="Amount to Sponsor (USDC)" 
                      value={investAmount} 
                      onChange={(e) => setInvestAmount(e.target.value)}
                      style={{ 
                        background: 'rgba(0,0,0,0.3)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '20px', 
                        padding: '12px 20px', 
                        color: '#fff',
                        outline: 'none',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <button 
                    className="solid-btn" 
                    style={{ width: '100%' }}
                    onClick={handleInvest}
                    disabled={isInvesting || !investAmount}
                  >
                    {isInvesting ? 'Processing Sponsorship...' : 'Back This Course'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', marginTop: '15px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BulbIcon size={14} color="var(--cyan-accent)" /> <strong>What happens next:</strong> Sponsoring transfers USDC from your wallet. If the campaign does not meet its target, your funds are safely refundable.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: PROFILE & CIRCLE APP KIT PORTAL ================= */}
          {activeTab === 'profile' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px' }}>
              
              {/* SOULBOUND CERTIFICATE FILE */}
              <div className="glass-panel" style={{ padding: '40px' }}>
                <h2 className="grad-text" style={{ fontSize: '2rem', marginTop: 0, marginBottom: '10px' }}>My Digital Diplomas</h2>
                <p style={{ color: '#9ca3af', marginBottom: '40px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  Your verifiable course completion badges. Stamped permanently on your profile as permanent proof of your learning and achievement.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  {hasCert ? (
                    <div className="glass-panel" style={{ padding: '25px', border: '1px solid #c5a059', background: 'radial-gradient(circle at top right, rgba(197, 160, 89, 0.1), transparent)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <DiplomaIcon size={36} color="var(--gold-accent)" glow={true} />
                        <span className="badge-stream" style={{ color: '#c5a059', borderColor: '#c5a059', background: 'transparent' }}>Permanent Diploma</span>
                      </div>

                      <h3 style={{ margin: '20px 0 10px 0', fontSize: '1.3rem' }}>
                        Course {activeCourseId}: {
                          activeCourseId === 1 ? "App Kits Developer Office Hours" :
                          activeCourseId === 2 ? "Using Circle Developer Controlled Wallets" :
                          "Event Replay: Day One Architect: Para"
                        }
                      </h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', lineHeight: '1.5' }}>
                        Awarded to: <span style={{ fontFamily: 'monospace', color: '#fff' }}>{address?.slice(0,6)}...{address?.slice(-6)}</span>
                      </p>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', lineHeight: '1.5' }}>
                        Issued by: <span style={{ color: '#fff' }}>EduStream Study Validator</span>
                      </p>
                      
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '15px', marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Publicly Verified <TrophyIcon size={12} color="#10b981" /></span>
                        <a 
                          href={`https://testnet.arcscan.app/address/${SOULBOUND_CERT_ADDRESS}`} 
                          target="_blank" 
                          style={{ fontSize: '0.75rem', color: '#66fcf1', textDecoration: 'none' }}
                        >
                          View Public Record ↗
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.5', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ScrollIcon size={24} color="var(--text-muted)" />
                        <strong style={{ color: '#fff', fontSize: '1rem' }}>No Diplomas Earned Yet</strong>
                      </div>
                      You haven't earned any diplomas for Course {activeCourseId} yet. Answer the lesson's quiz under the <strong>"Learn & Watch"</strong> tab with a perfect 100% score to instantly graduate and receive your diploma!
                    </div>
                  )}
                </div>
              </div>

              {/* CIRCLE APP KIT SDK PEER PORTAL */}
              <div className="glass-panel" style={{ padding: '40px' }}>
                <h2 className="grad-text" style={{ fontSize: '2rem', marginTop: 0, marginBottom: '10px' }}>Instant Friend Transfers</h2>
                <p style={{ color: '#9ca3af', marginBottom: '30px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  Send USD stablecoins directly to other students or study partners instantly with zero intermediation.
                </p>

                <div className="glass-panel" style={{ padding: '30px', background: 'rgba(0,0,0,0.2)' }}>
                  <h4 style={{ marginTop: 0, color: '#66fcf1', marginBottom: '15px' }}>Send Money</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0 }}>Friend's Wallet Address</label>
                        <button 
                          onClick={() => {
                            setCircleRecipient('0x2d2FF7dCAa370acf7B714D3129F79f95A13B03F8');
                            setCircleAmount('1.00');
                          }}
                          style={{ 
                            background: 'rgba(102, 252, 241, 0.08)',
                            border: '1px solid rgba(102, 252, 241, 0.2)',
                            borderRadius: '12px',
                            color: '#66fcf1',
                            fontSize: '0.75rem',
                            padding: '3px 10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          type="button"
                          title="Auto-populate recipient and amount for quick demo"
                        >
                          ⚡ Autofill Demo
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="e.g. 0x2d2FF7dCAa370acf7B714D3129F79f95A13B03F8" 
                        value={circleRecipient} 
                        onChange={(e) => setCircleRecipient(e.target.value)}
                        style={{ 
                          width: '100%',
                          background: 'rgba(0,0,0,0.3)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '20px', 
                          padding: '12px 20px', 
                          color: '#fff',
                          outline: 'none',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>USDC Amount</label>
                      <input 
                        type="number" 
                        placeholder="Amount in USDC" 
                        value={circleAmount} 
                        onChange={(e) => setCircleAmount(e.target.value)}
                        style={{ 
                          width: '100%',
                          background: 'rgba(0,0,0,0.3)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '20px', 
                          padding: '12px 20px', 
                          color: '#fff',
                          outline: 'none',
                          fontSize: '0.9rem'
                        }}
                      />
                    </div>
                  </div>

                   <button 
                    className="solid-btn" 
                    style={{ width: '100%', background: '#66fcf1', color: '#000', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={handleCircleSend}
                    disabled={isCircleSending}
                  >
                    {isCircleSending ? 'Sending USDC Instantly...' : 'Send USDC Instantly'}
                    {!isCircleSending && <TransferIcon size={14} color="#000" />}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(102, 252, 241, 0.02)', padding: '12px', borderRadius: '8px', marginTop: '15px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BulbIcon size={14} color="var(--cyan-accent)" /> <strong>What happens next:</strong> Money is transferred directly to your friend's wallet. It takes less than 1 second to confirm!
                    </span>
                  </div>

                  {circleTxHash && (
                    <div style={{ 
                      marginTop: '20px', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: 'rgba(102,252,241,0.05)', 
                      border: '1px solid rgba(102,252,241,0.2)',
                      fontSize: '0.8rem',
                      lineHeight: '1.4'
                    }}>
                      <div style={{ color: '#66fcf1', fontWeight: 'bold', marginBottom: '4px' }}>Transaction Receipt:</div>
                      <a href={`https://testnet.arcscan.app/tx/${circleTxHash}`} target="_blank" style={{ color: '#fff', textDecoration: 'underline', wordBreak: 'break-all' }}>
                        {circleTxHash} ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: CREATOR STUDIO ================= */}
          {activeTab === 'creator' && (
            <div className="glass-panel" style={{ padding: '40px' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '30px', marginBottom: '40px' }}>
                <span className="badge-stream" style={{ background: 'rgba(197, 160, 89, 0.1)', color: '#c5a059', borderColor: '#c5a059', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldIcon size={12} color="var(--gold-accent)" /> Teacher Command Center
                </span>
                <h2 style={{ margin: '10px 0 5px 0', fontSize: '2rem' }}>Teacher Command Center</h2>
                <p style={{ color: '#9ca3af', maxWidth: '600px', margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
                  Register new classes, launch production funding campaigns, and withdraw your accrued teaching royalties easily.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '50px' }}>
                
                {/* COURSE & CAMPAIGN CREATION FORM */}
                <div className="glass-panel" style={{ padding: '30px', background: 'rgba(0,0,0,0.1)' }}>
                  <h3 style={{ marginTop: 0, color: '#c5a059', marginBottom: '20px' }}>Publish a Course & Start Funding</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Unique ID number for this Course</label>
                      <input 
                        type="number" 
                        value={newCourseId} 
                        onChange={(e) => setNewCourseId(e.target.value)}
                        style={{ 
                          width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '20px', padding: '10px 15px', color: '#fff', outline: 'none' 
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Course / Lecture Name</label>
                      <input 
                        type="text" 
                        placeholder="Example: Advanced Smart Escrows & CCTP" 
                        value={newCourseName} 
                        onChange={(e) => setNewCourseName(e.target.value)}
                        style={{ 
                          width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '20px', padding: '10px 15px', color: '#fff', outline: 'none' 
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Study Cost per Hour (in USDC)</label>
                        <input 
                          type="number" 
                          step="0.1" 
                          value={newCourseRate} 
                          onChange={(e) => setNewCourseRate(e.target.value)}
                          style={{ 
                            width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '20px', padding: '10px 15px', color: '#fff', outline: 'none' 
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Funding Goal (in USDC)</label>
                        <input 
                          type="number" 
                          value={newFundingGoal} 
                          onChange={(e) => setNewFundingGoal(e.target.value)}
                          style={{ 
                            width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '20px', padding: '10px 15px', color: '#fff', outline: 'none' 
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Funding Duration (in Seconds, e.g. 86400 for 1 Day)</label>
                      <input 
                        type="number" 
                        value={newFundingDuration} 
                        onChange={(e) => setNewFundingDuration(e.target.value)}
                        style={{ 
                          width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '20px', padding: '10px 15px', color: '#fff', outline: 'none' 
                        }}
                      />
                    </div>
                  </div>

                  <button 
                    className="solid-btn" 
                    style={{ width: '100%', borderColor: '#c5a059', color: '#c5a059', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={handleCreateCourseAndCampaign}
                    disabled={isCreatingCourse}
                  >
                    {isCreatingCourse ? 'Registering details...' : 'Publish Course & Start Funding'}
                    {!isCreatingCourse && <RocketIcon size={14} color="var(--gold-accent)" />}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', marginTop: '15px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BulbIcon size={14} color="var(--cyan-accent)" /> <strong>What happens next:</strong> This registers your new course details and kicks off your community sponsorship campaign instantly.
                    </span>
                  </div>

                </div>

                {/* WITHDRAWALS & ACTIVE CAMPAIGNS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                  
                  {/* Earnings Withdrawal Box */}
                  <div className="glass-panel" style={{ padding: '30px' }}>
                    <h3 style={{ marginTop: 0, color: '#66fcf1', marginBottom: '15px' }}>My Student Streaming Earnings</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '25px' }}>
                      USDC streamed to you by the second from active students watching your lessons.
                    </p>

                    <div className="metric-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <div className="metric-label">My Unclaimed Earnings</div>
                        <div className="metric-value" style={{ color: '#66fcf1', fontSize: '1.8rem' }}>
                          {creatorEarnings ? parseFloat(formatUnits(creatorEarnings as bigint, 6)).toFixed(6) : '0.000000'} USDC
                        </div>
                      </div>
                      <button 
                        className="solid-btn"
                        onClick={handleCreatorWithdraw}
                        disabled={!creatorEarnings || (creatorEarnings as bigint) === 0n}
                      >
                        Withdraw My Earnings
                      </button>
                    </div>
                  </div>

                  {/* Crowdfund Finalization Box */}
                  <div className="glass-panel" style={{ padding: '30px' }}>
                    <h3 style={{ marginTop: 0, color: '#c5a059', marginBottom: '15px' }}>Collect Sponsor Funds</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '20px' }}>
                      Once your campaign successfully meets its funding goal, you can collect the sponsorships directly into your wallet to start production.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '15px 25px', borderRadius: '15px' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Active Campaign ID</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{activeCourseId}</div>
                      </div>
                       <button 
                        className="neon-btn" 
                        style={{ borderColor: '#10b981', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={handleClaimCampaignCapital}
                        disabled={!campaignDetails || (campaignDetails as any)[6]} // disable if already claimed
                      >
                        {(campaignDetails && (campaignDetails as any)[6]) ? 'Capital Claimed' : 'Collect Raised Funds'}
                        {!campaignDetails || !(campaignDetails as any)[6] ? <SponsorIcon size={14} color="#10b981" /> : null}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

        </main>
      )}
      {/* PREMIUM CUSTOM NOTIFICATION MODAL OVERLAY */}
      {modalConfig.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(5, 7, 10, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div className="glass-panel" style={{
            maxWidth: '500px',
            width: '90%',
            padding: '35px 30px',
            textAlign: 'center',
            border: `1px solid ${
              modalConfig.type === 'success' ? 'rgba(16, 185, 129, 0.4)' :
              modalConfig.type === 'error' ? 'rgba(239, 68, 68, 0.4)' :
              'rgba(102, 252, 241, 0.4)'
            }`,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(9, 12, 22, 0.98))',
            boxShadow: `0 0 35px ${
              modalConfig.type === 'success' ? 'rgba(16, 185, 129, 0.25)' :
              modalConfig.type === 'error' ? 'rgba(239, 68, 68, 0.25)' :
              'rgba(102, 252, 241, 0.25)'
            }`,
            borderRadius: '24px',
            position: 'relative'
          }}>
            <button 
              onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
              style={{
                position: 'absolute',
                top: '15px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                fontSize: '1.25rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
              {modalConfig.type === 'success' && <TrophyIcon size={56} color="#10b981" glow={true} />}
              {modalConfig.type === 'error' && <span style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 10px rgba(239,68,68,0.5))' }}>⚠️</span>}
              {modalConfig.type === 'info' && <BulbIcon size={56} color="var(--cyan-accent)" glow={true} />}
            </div>

            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: modalConfig.type === 'success' ? '#10b981' : modalConfig.type === 'error' ? '#ef4444' : '#66fcf1'
            }}>
              {modalConfig.title}
            </h3>

            <p style={{
              color: '#d1d5db',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              margin: '0 0 30px 0',
              wordBreak: 'break-word'
            }}>
              {modalConfig.message}
            </p>

            <button 
              className="solid-btn"
              style={{
                minWidth: '150px',
                background: modalConfig.type === 'success' ? '#10b981' : modalConfig.type === 'error' ? '#ef4444' : '#66fcf1',
                color: '#05070a',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '24px',
                padding: '12px 28px',
                cursor: 'pointer',
                boxShadow: `0 4px 15px ${
                  modalConfig.type === 'success' ? 'rgba(16, 185, 129, 0.4)' :
                  modalConfig.type === 'error' ? 'rgba(239, 68, 68, 0.4)' :
                  'rgba(102, 252, 241, 0.4)'
                }`
              }}
              onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            >
              Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
