// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CourseFund is Ownable, ReentrancyGuard {
    address public immutable usdcToken;
    address public eduStreamer;

    uint256 private constant PRECISION = 1e18; // High precision for revenue splits

    struct Campaign {
        uint256 id;
        uint256 courseId;
        address instructor;
        uint256 fundingGoal;           // Goal in USDC (6 decimals)
        uint256 totalInvested;         // Total invested USDC (6 decimals)
        uint256 deadline;              // Timestamp of funding deadline
        bool fundingClaimed;           // Instructor has claimed capital
        bool finalized;                 // Goal reached and campaign closed
        uint256 accumulatedRevPerShare; // 18-decimal precision revenue accumulator
        uint256 totalShares;           // Equal to totalInvested after finalization
    }

    uint256 public nextCampaignId;
    
    // Maps campaignId => Campaign details
    mapping(uint256 => Campaign) public campaigns;
    
    // Maps courseId => campaignId
    mapping(uint256 => uint256) public courseToCampaign;

    // Maps campaignId => investorAddress => shares owned
    mapping(uint256 => mapping(address => uint256)) public investorShares;
    
    // Maps campaignId => investorAddress => last claimed revenue baseline
    mapping(uint256 => mapping(address => uint256)) public lastClaimedRevPerShare;
    
    // Maps campaignId => investorAddress => total revenue already claimed
    mapping(uint256 => mapping(address => uint256)) public claimedRevenue;

    event CampaignCreated(uint256 indexed campaignId, uint256 indexed courseId, address indexed instructor, uint256 fundingGoal, uint256 deadline);
    event Invested(uint256 indexed campaignId, address indexed investor, uint256 amount);
    event Refunded(uint256 indexed campaignId, address indexed investor, uint256 amount);
    event CampaignFinalized(uint256 indexed campaignId, uint256 totalInvested);
    event CapitalClaimed(uint256 indexed campaignId, address indexed instructor, uint256 amount);
    event RevenueDistributed(uint256 indexed campaignId, uint256 amount, uint256 accumulatedRevPerShare);
    event RevenueClaimed(uint256 indexed campaignId, address indexed investor, uint256 amount);
    event EduStreamerUpdated(address indexed newEduStreamer);

    modifier onlyEduStreamer() {
        require(msg.sender == eduStreamer, "Only EduStreamer contract can execute");
        _;
    }

    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "USDC token address cannot be zero");
        usdcToken = _usdcToken;
    }

    // Set the EduStreamer contract address
    function setEduStreamer(address _eduStreamer) external onlyOwner {
        require(_eduStreamer != address(0), "EduStreamer cannot be zero address");
        eduStreamer = _eduStreamer;
        emit EduStreamerUpdated(_eduStreamer);
    }

    // Create a crowdfunding campaign for a course
    function createCampaign(
        uint256 _courseId,
        address _instructor,
        uint256 _fundingGoal,
        uint256 _durationSeconds
    ) external returns (uint256) {
        require(_instructor != address(0), "Instructor cannot be zero address");
        require(_fundingGoal > 0, "Funding goal must be greater than zero");
        require(_durationSeconds >= 60, "Duration must be at least 1 minute");
        require(courseToCampaign[_courseId] == 0, "Campaign already exists for course");

        uint256 campaignId = ++nextCampaignId;
        campaigns[campaignId] = Campaign({
            id: campaignId,
            courseId: _courseId,
            instructor: _instructor,
            fundingGoal: _fundingGoal,
            totalInvested: 0,
            deadline: block.timestamp + _durationSeconds,
            fundingClaimed: false,
            finalized: false,
            accumulatedRevPerShare: 0,
            totalShares: 0
        });

        courseToCampaign[_courseId] = campaignId;

        emit CampaignCreated(campaignId, _courseId, _instructor, _fundingGoal, campaigns[campaignId].deadline);
        return campaignId;
    }

    // Invest USDC into a campaign
    function invest(uint256 _campaignId, uint256 _amount) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "Campaign does not exist");
        require(block.timestamp < campaign.deadline, "Funding deadline has passed");
        require(!campaign.finalized, "Campaign is already finalized");
        require(_amount > 0, "Amount must be greater than zero");

        // Transfer USDC from investor to this contract
        bool success = IERC20(usdcToken).transferFrom(msg.sender, address(this), _amount);
        require(success, "USDC transfer failed");

        campaign.totalInvested += _amount;
        investorShares[_campaignId][msg.sender] += _amount;

        emit Invested(_campaignId, msg.sender, _amount);

        // Auto finalize if goal is reached
        if (campaign.totalInvested >= campaign.fundingGoal) {
            _finalizeCampaign(_campaignId);
        }
    }

    // Force finalize campaign if goal is met after deadline passes
    function finalizeCampaign(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "Campaign does not exist");
        require(block.timestamp >= campaign.deadline, "Deadline has not passed yet");
        require(!campaign.finalized, "Campaign is already finalized");
        
        require(campaign.totalInvested >= campaign.fundingGoal, "Funding goal was not met");
        _finalizeCampaign(_campaignId);
    }

    function _finalizeCampaign(uint256 _campaignId) internal {
        Campaign storage campaign = campaigns[_campaignId];
        campaign.finalized = true;
        campaign.totalShares = campaign.totalInvested;
        
        emit CampaignFinalized(_campaignId, campaign.totalInvested);
    }

    // Refund investment if deadline passed and funding goal was not reached
    function refund(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "Campaign does not exist");
        require(block.timestamp >= campaign.deadline, "Funding is still active");
        require(!campaign.finalized, "Campaign successfully funded, cannot refund");
        
        uint256 shares = investorShares[_campaignId][msg.sender];
        require(shares > 0, "No investment found");

        investorShares[_campaignId][msg.sender] = 0;
        
        bool success = IERC20(usdcToken).transfer(msg.sender, shares);
        require(success, "USDC transfer failed");

        emit Refunded(_campaignId, msg.sender, shares);
    }

    // Instructor claims the funded capital (only if finalized successfully)
    function claimFundingCapital(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.id != 0, "Campaign does not exist");
        require(campaign.finalized, "Campaign is not finalized");
        require(msg.sender == campaign.instructor, "Only the instructor can claim capital");
        require(!campaign.fundingClaimed, "Capital already claimed");

        campaign.fundingClaimed = true;
        
        bool success = IERC20(usdcToken).transfer(campaign.instructor, campaign.totalInvested);
        require(success, "USDC transfer failed");

        emit CapitalClaimed(_campaignId, campaign.instructor, campaign.totalInvested);
    }

    /**
     * @dev Receive co-investment split from EduStreamer.
     * Scale the incoming revenue into the accumulated rev per share tracking mapping.
     */
    function distributeRevenue(uint256 _courseId, uint256 _amount) external onlyEduStreamer nonReentrant {
        uint256 campaignId = courseToCampaign[_courseId];
        require(campaignId != 0, "No campaign active for course");
        
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.finalized, "Campaign was not successfully finalized");
        require(campaign.totalShares > 0, "Shares base must be greater than zero");

        // Pull the routed USDC from EduStreamer to this contract
        bool success = IERC20(usdcToken).transferFrom(msg.sender, address(this), _amount);
        require(success, "Failed to pull split from EduStreamer");

        // Accumulate revenue per share in 18 decimal scale
        campaign.accumulatedRevPerShare += (_amount * PRECISION) / campaign.totalShares;

        emit RevenueDistributed(campaignId, _amount, campaign.accumulatedRevPerShare);
    }

    // Claim accumulated revenue share as an investor
    function claimRevenueShare(uint256 _campaignId) external nonReentrant {
        Campaign memory campaign = campaigns[_campaignId];
        require(campaign.id != 0, "Campaign does not exist");
        require(campaign.finalized, "Campaign is not finalized");

        uint256 shares = investorShares[_campaignId][msg.sender];
        require(shares > 0, "You do not own shares in this course");

        uint256 owed = (shares * (campaign.accumulatedRevPerShare - lastClaimedRevPerShare[_campaignId][msg.sender])) / PRECISION;
        require(owed > 0, "No new revenue owed");

        lastClaimedRevPerShare[_campaignId][msg.sender] = campaign.accumulatedRevPerShare;
        claimedRevenue[_campaignId][msg.sender] += owed;

        bool success = IERC20(usdcToken).transfer(msg.sender, owed);
        require(success, "USDC transfer failed");

        emit RevenueClaimed(_campaignId, msg.sender, owed);
    }

    // View helper to check pending revenue for a co-investor
    function getPendingRevenue(uint256 _campaignId, address _investor) external view returns (uint256) {
        Campaign memory campaign = campaigns[_campaignId];
        if (!campaign.finalized) return 0;
        
        uint256 shares = investorShares[_campaignId][_investor];
        if (shares == 0) return 0;

        return (shares * (campaign.accumulatedRevPerShare - lastClaimedRevPerShare[_campaignId][_investor])) / PRECISION;
    }
}
