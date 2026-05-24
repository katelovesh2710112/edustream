// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICourseFund {
    function distributeRevenue(uint256 courseId, uint256 amount) external;
}

contract EduStreamer is Ownable, ReentrancyGuard {
    // USDC ERC-20 token address on Arc Testnet
    address public immutable usdcToken;
    
    // Address where platform fees are sent
    address public platformTreasury;
    
    // Platform fee percentage (e.g., 3 = 3%)
    uint256 public platformFeePercent = 3;
    
    // Struct representing a course in the ecosystem
    struct Course {
        uint256 id;
        address instructor;
        uint256 ratePerSecond;        // rate in USDC micro-units (6 decimals) per second (e.g. 0.00055 USDC = 550)
        bool coInvested;              // is the course co-invested?
        address coInvestmentContract; // address of the co-investment distributor
        bool active;
    }

    // Maps courseId => Course details
    mapping(uint256 => Course) public courses;
    
    // Maps studentAddress => current deposited balance of USDC
    mapping(address => uint256) public studentDeposits;
    
    // Maps instructorAddress => accrued withdrawable USDC balance
    mapping(address => uint256) public instructorBalances;
    
    // Accrued withdrawable platform treasury balance
    uint256 public platformTreasuryBalance;

    // Events
    event CourseRegistered(uint256 indexed courseId, address indexed instructor, uint256 ratePerSecond, bool coInvested, address coInvestmentContract);
    event USDCDeposited(address indexed student, uint256 amount);
    event USCWithdrawn(address indexed student, uint256 amount);
    event StreamSettled(address indexed student, uint256 indexed courseId, uint256 secondsStreamed, uint256 totalCost, uint256 instructorShare, uint256 platformShare, uint256 coInvestShare);
    event InstructorWithdrawn(address indexed instructor, uint256 amount);
    event PlatformTreasuryWithdrawn(address indexed treasury, uint256 amount);
    event PlatformTreasuryUpdated(address indexed newTreasury);
    event PlatformFeeUpdated(uint256 newFeePercent);

    constructor(address _usdcToken, address _platformTreasury) Ownable(msg.sender) {
        require(_usdcToken != address(0), "USDC token address cannot be zero");
        require(_platformTreasury != address(0), "Platform treasury address cannot be zero");
        usdcToken = _usdcToken;
        platformTreasury = _platformTreasury;
    }

    // Register a course in the streaming system
    function registerCourse(
        uint256 _courseId,
        address _instructor,
        uint256 _ratePerSecond,
        bool _coInvested,
        address _coInvestmentContract
    ) external {
        // Can be registered by the platform owner or the instructor themselves (if owner approves/initializes)
        require(msg.sender == owner() || msg.sender == _instructor, "Unauthorized registration");
        require(_instructor != address(0), "Instructor address cannot be zero");
        require(_ratePerSecond > 0, "Rate per second must be greater than zero");
        
        if (_coInvested) {
            require(_coInvestmentContract != address(0), "Co-investment contract cannot be zero");
        }

        courses[_courseId] = Course({
            id: _courseId,
            instructor: _instructor,
            ratePerSecond: _ratePerSecond,
            coInvested: _coInvested,
            coInvestmentContract: _coInvestmentContract,
            active: true
        });

        emit CourseRegistered(_courseId, _instructor, _ratePerSecond, _coInvested, _coInvestmentContract);
    }

    // Disable a course from receiving new streams
    function setCourseActive(uint256 _courseId, bool _active) external onlyOwner {
        require(courses[_courseId].id != 0, "Course does not exist");
        courses[_courseId].active = _active;
    }

    // Deposit USDC into the streaming contract to fund learning sessions
    function depositUSDC(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than zero");
        
        // Transfer USDC from student to this contract
        bool success = IERC20(usdcToken).transferFrom(msg.sender, address(this), _amount);
        require(success, "USDC transfer failed");

        studentDeposits[msg.sender] += _amount;
        emit USDCDeposited(msg.sender, _amount);
    }

    // Withdraw unused USDC deposit
    function withdrawUSDC(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than zero");
        require(studentDeposits[msg.sender] >= _amount, "Insufficient deposit balance");

        studentDeposits[msg.sender] -= _amount;
        
        bool success = IERC20(usdcToken).transfer(msg.sender, _amount);
        require(success, "USDC transfer failed");

        emit USCWithdrawn(msg.sender, _amount);
    }

    /**
     * @dev Settle a student's streaming session on-chain.
     * Can be called by the student, the instructor, or the platform admin (under session agreements).
     */
    function settleStream(
        address _student,
        uint256 _courseId,
        uint256 _secondsStreamed
    ) external nonReentrant {
        Course storage course = courses[_courseId];
        require(course.active, "Course is not active");
        require(_secondsStreamed > 0, "Seconds streamed must be greater than zero");
        
        uint256 totalCost = _secondsStreamed * course.ratePerSecond;
        require(totalCost > 0, "Total cost resolved to zero");

        // Verify/Deduct student balance
        if (studentDeposits[_student] < totalCost) {
            // Attempt to pull directly if student approved contract directly
            uint256 missingAmount = totalCost - studentDeposits[_student];
            
            // First consume remaining deposits if any
            if (studentDeposits[_student] > 0) {
                totalCost = studentDeposits[_student];
                studentDeposits[_student] = 0;
            } else {
                totalCost = 0;
            }

            // Pull missing amount directly via transferFrom
            bool success = IERC20(usdcToken).transferFrom(_student, address(this), missingAmount);
            require(success, "Insufficient student deposit and direct transfer failed");
            
            // Total cost is now fully settled
            totalCost += missingAmount;
        } else {
            studentDeposits[_student] -= totalCost;
        }

        // Calculate Splits
        uint256 platformShare = (totalCost * platformFeePercent) / 100;
        uint256 coInvestShare = 0;
        uint256 instructorShare = 0;

        if (course.coInvested && course.coInvestmentContract != address(0)) {
            // 20% for co-investors, 3% for platform, 77% for instructor
            coInvestShare = (totalCost * 20) / 100;
            instructorShare = totalCost - platformShare - coInvestShare;
            
            // Transfer co-invest share directly to the Co-Investment Contract and notify
            bool success = IERC20(usdcToken).approve(course.coInvestmentContract, coInvestShare);
            require(success, "Approval to co-invest contract failed");
            
            try ICourseFund(course.coInvestmentContract).distributeRevenue(course.id, coInvestShare) {
                // Succeeded
            } catch {
                // Fallback: If co-investment distribution fails, award entire remaining amount to instructor to avoid freezing
                instructorShare += coInvestShare;
                coInvestShare = 0;
            }
        } else {
            // 3% for platform, 97% for instructor
            instructorShare = totalCost - platformShare;
        }

        // Accrue balances
        platformTreasuryBalance += platformShare;
        instructorBalances[course.instructor] += instructorShare;

        emit StreamSettled(
            _student,
            _courseId,
            _secondsStreamed,
            totalCost,
            instructorShare,
            platformShare,
            coInvestShare
        );
    }

    // Instructors withdraw their accrued streaming earnings
    function withdrawInstructorAccrued() external nonReentrant {
        uint256 amount = instructorBalances[msg.sender];
        require(amount > 0, "No withdrawable earnings");

        instructorBalances[msg.sender] = 0;
        
        bool success = IERC20(usdcToken).transfer(msg.sender, amount);
        require(success, "USDC transfer failed");

        emit InstructorWithdrawn(msg.sender, amount);
    }

    // Platform treasury withdraws accrued platform fees
    function withdrawPlatformTreasury() external nonReentrant {
        require(msg.sender == platformTreasury, "Only platform treasury can withdraw fees");
        uint256 amount = platformTreasuryBalance;
        require(amount > 0, "No platform fees accrued");

        platformTreasuryBalance = 0;
        
        bool success = IERC20(usdcToken).transfer(platformTreasury, amount);
        require(success, "USDC transfer failed");

        emit PlatformTreasuryWithdrawn(platformTreasury, amount);
    }

    // Owner configuration functions
    function updatePlatformTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Treasury address cannot be zero");
        platformTreasury = _newTreasury;
        emit PlatformTreasuryUpdated(_newTreasury);
    }

    function updatePlatformFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 20, "Platform fee cannot exceed 20%");
        platformFeePercent = _newFeePercent;
        emit PlatformFeeUpdated(_newFeePercent);
    }
}
