import { ethers, Contract, BrowserProvider, JsonRpcSigner } from 'ethers';

// USDC has 6 decimals
const USDC_DECIMALS = 6;

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) external returns (bool)',
];

/**
 * Hardcoded ABI for the EscrowcontractWorkflow smart contract.
 * Source: https://app.toolblox.net/summary/escrow_workflow_38b04850
 *
 * Key notes:
 *  - `create` takes (price, buyer, externalId) where externalId is a bytes16 GUID
 *    representing the negotiation ID. It returns a uint256 contract item ID.
 *  - Subsequent operations (deposit, confirm, flag, updatePrice) use the uint256
 *    contract item ID — NOT the negotiation UUID.
 *  - Items can be looked up by externalId via getItemIdByExternalId / getItemByExternalId.
 *
 * On-chain statuses:
 *   0 = Created  (owner: Seller)
 *   1 = Deposited (owner: Buyer)
 *   2 = Confirmed (owner: Buyer)
 *   3 = Flagged   (owner: Buyer)
 */
const ESCROW_ABI = [
  // State-changing functions
  'function create(uint256 price, address buyer, bytes16 externalId) external returns (uint256)',
  'function deposit(uint256 id) external returns (uint256)',
  'function confirm(uint256 id) external returns (uint256)',
  'function flag(uint256 id) external returns (uint256)',
  'function updatePrice(uint256 id, uint256 topay) external returns (uint256)',

  // View functions
  'function getItem(uint256 id) view returns (tuple(uint256 id, uint64 status, uint256 price, address buyer, address seller, uint256 reimburse, bytes16 externalId, uint256 confirmationTime))',
  'function getItemIdByExternalId(bytes16 externalId) view returns (uint256)',
  'function getItemByExternalId(bytes16 externalId) view returns (tuple(uint256 id, uint64 status, uint256 price, address buyer, address seller, uint256 reimburse, bytes16 externalId, uint256 confirmationTime))',

  // Events (ItemUpdated comes from WorkflowBase)
  'event ItemUpdated(uint256 id, uint64 status)',
];

export type EscrowStatus = 'none' | 'created' | 'funded' | 'confirmed' | 'flagged' | 'resolved';

export interface EscrowInfo {
  id: bigint;
  seller: string;
  buyer: string;
  price: bigint;
  status: EscrowStatus;
  reimburse: bigint;
  externalId: string;
  confirmationTime: bigint;
}

export interface EscrowConfig {
  contractAddress: string;
}

export interface CreateEscrowResult {
  txHash: string;
  /** The uint256 item ID assigned by the contract. Store this for subsequent operations. */
  contractItemId: string;
}

/**
 * Map on-chain status number to app status string.
 * On-chain: 0=Created, 1=Deposited, 2=Confirmed, 3=Flagged
 * Note: 'resolved' is an app-level status (after updatePrice) — on-chain it stays Flagged (3).
 */
function getStatusFromNumber(status: number): EscrowStatus {
  const statuses: EscrowStatus[] = ['created', 'funded', 'confirmed', 'flagged'];
  return statuses[status] || 'none';
}

/**
 * Convert a negotiation UUID (e.g. "550e8400-e29b-41d4-a716-446655440000")
 * to a bytes16 hex string for the contract's externalId field.
 */
function negotiationIdToBytes16(negotiationId: string): string {
  const hex = negotiationId.replace(/-/g, '');
  if (hex.length !== 32) {
    throw new Error(`Invalid negotiation ID format: expected UUID (32 hex chars), got ${hex.length}`);
  }
  return '0x' + hex;
}

export function getEscrowConfig(): EscrowConfig | null {
  const contractAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS ||
    process.env.ESCROW_CONTRACT_ADDRESS;

  if (!contractAddress) {
    return null;
  }

  return { contractAddress };
}

export function isEscrowConfigured(): boolean {
  return getEscrowConfig() !== null;
}

export function createEscrowContract(
  signerOrProvider: JsonRpcSigner | ethers.Provider
): Contract | null {
  const config = getEscrowConfig();
  if (!config) return null;

  return new Contract(config.contractAddress, ESCROW_ABI, signerOrProvider);
}

/**
 * Seller creates an escrow on-chain.
 *
 * @param signer - Wallet signer (seller)
 * @param negotiationId - The negotiation UUID, stored as externalId (bytes16) on-chain
 * @param priceUSDC - Price in USDC on-chain units (6 decimals)
 * @param buyerAddress - Buyer wallet address
 * @returns txHash and the contract's auto-assigned uint256 item ID
 */
export async function createEscrow(
  signer: JsonRpcSigner,
  negotiationId: string,
  priceUSDC: bigint,
  buyerAddress: string
): Promise<CreateEscrowResult> {
  const contract = createEscrowContract(signer);
  if (!contract) throw new Error('Escrow contract not configured');

  const externalId = negotiationIdToBytes16(negotiationId);
  const tx = await contract.create(priceUSDC, buyerAddress, externalId);
  const receipt = await tx.wait();

  // Extract the contract item ID from the ItemUpdated event
  let contractItemId = '0';
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === 'ItemUpdated') {
        contractItemId = parsed.args[0].toString();
        break;
      }
    } catch {
      // Not our event, skip
    }
  }

  return { txHash: receipt.hash, contractItemId };
}

/**
 * Buyer deposits USDC to escrow. Caller must have already approved the escrow
 * contract to spend the required USDC amount via approveUSDC().
 * The contract reads the price from storage — no amount parameter needed.
 *
 * @param contractItemId - The uint256 item ID from the contract (returned by createEscrow)
 */
export async function depositToEscrow(
  signer: JsonRpcSigner,
  contractItemId: string
): Promise<string> {
  const contract = createEscrowContract(signer);
  if (!contract) throw new Error('Escrow contract not configured');

  const tx = await contract.deposit(BigInt(contractItemId));
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Buyer confirms delivery — releases funds to seller.
 * Can also be called by anyone after the 14-day confirmation window expires.
 *
 * @param contractItemId - The uint256 item ID from the contract
 */
export async function confirmDelivery(
  signer: JsonRpcSigner,
  contractItemId: string
): Promise<string> {
  const contract = createEscrowContract(signer);
  if (!contract) throw new Error('Escrow contract not configured');

  const tx = await contract.confirm(BigInt(contractItemId));
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Buyer flags an issue with the escrow (moves from Deposited → Flagged).
 *
 * @param contractItemId - The uint256 item ID from the contract
 */
export async function flagIssue(
  signer: JsonRpcSigner,
  contractItemId: string
): Promise<string> {
  const contract = createEscrowContract(signer);
  if (!contract) throw new Error('Escrow contract not configured');

  const tx = await contract.flag(BigInt(contractItemId));
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Platform resolves a flagged escrow by setting a new price (topay).
 * Reimburse = original price - topay. After this, confirm() releases adjusted funds.
 *
 * @param contractItemId - The uint256 item ID from the contract
 * @param topay - The new price the seller should receive (USDC on-chain units)
 */
export async function updatePrice(
  signer: JsonRpcSigner,
  contractItemId: string,
  topay: bigint
): Promise<string> {
  const contract = createEscrowContract(signer);
  if (!contract) throw new Error('Escrow contract not configured');

  const tx = await contract.updatePrice(BigInt(contractItemId), topay);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Look up escrow info by negotiation UUID (uses getItemByExternalId on-chain).
 *
 * @param negotiationId - The negotiation UUID used as externalId when creating
 */
export async function getEscrowInfo(
  provider: ethers.Provider,
  negotiationId: string
): Promise<EscrowInfo | null> {
  const contract = createEscrowContract(provider);
  if (!contract) return null;

  try {
    const externalId = negotiationIdToBytes16(negotiationId);
    const result = await contract.getItemByExternalId(externalId);

    // If id is 0, item doesn't exist
    if (result.id === BigInt(0)) return null;

    return {
      id: result.id,
      seller: result.seller,
      buyer: result.buyer,
      price: result.price,
      status: getStatusFromNumber(Number(result.status)),
      reimburse: result.reimburse,
      externalId: result.externalId,
      confirmationTime: result.confirmationTime,
    };
  } catch {
    return null;
  }
}

/**
 * Look up escrow info by contract item ID (uses getItem on-chain).
 *
 * @param contractItemId - The uint256 item ID from the contract
 */
export async function getEscrowInfoById(
  provider: ethers.Provider,
  contractItemId: string
): Promise<EscrowInfo | null> {
  const contract = createEscrowContract(provider);
  if (!contract) return null;

  try {
    const result = await contract.getItem(BigInt(contractItemId));

    if (result.id === BigInt(0)) return null;

    return {
      id: result.id,
      seller: result.seller,
      buyer: result.buyer,
      price: result.price,
      status: getStatusFromNumber(Number(result.status)),
      reimburse: result.reimburse,
      externalId: result.externalId,
      confirmationTime: result.confirmationTime,
    };
  } catch {
    return null;
  }
}

export function formatEther(wei: bigint): string {
  return ethers.formatEther(wei);
}

export function parseEther(ether: string): bigint {
  return ethers.parseEther(ether);
}

// ── USDC helpers ────────────────────────────────────────────

/** Convert a human-readable USDC amount (e.g. "150.50") to its 6-decimal on-chain representation. */
export function parseUSDC(amount: string | number): bigint {
  const str = typeof amount === 'number' ? amount.toFixed(USDC_DECIMALS) : amount;
  return ethers.parseUnits(str, USDC_DECIMALS);
}

/** Convert an on-chain USDC amount (6 decimals) back to a human-readable string. */
export function formatUSDC(raw: bigint): string {
  return ethers.formatUnits(raw, USDC_DECIMALS);
}

/** Format a USDC amount for display with $ sign and 2 decimal places. */
export function displayUSDC(raw: bigint): string {
  const num = parseFloat(ethers.formatUnits(raw, USDC_DECIMALS));
  return `$${num.toFixed(2)} USDC`;
}

/** Get the configured USDC token contract address. */
export function getUSDCAddress(): string | null {
  return process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS ||
    process.env.USDC_CONTRACT_ADDRESS ||
    null;
}

/** Create an ERC-20 contract instance for USDC. */
export function createUSDCContract(
  signerOrProvider: JsonRpcSigner | ethers.Provider
): Contract | null {
  const address = getUSDCAddress();
  if (!address) return null;
  return new Contract(address, ERC20_ABI, signerOrProvider);
}

/** Approve the escrow contract to spend USDC on behalf of the signer. */
export async function approveUSDC(
  signer: JsonRpcSigner,
  amount: bigint
): Promise<string> {
  const usdc = createUSDCContract(signer);
  if (!usdc) throw new Error('USDC contract address not configured');

  const config = getEscrowConfig();
  if (!config) throw new Error('Escrow contract not configured');

  const tx = await usdc.approve(config.contractAddress, amount);
  const receipt = await tx.wait();
  return receipt.hash;
}

/** Check USDC allowance for the escrow contract. */
export async function getUSDCAllowance(
  provider: ethers.Provider,
  ownerAddress: string
): Promise<bigint> {
  const usdc = createUSDCContract(provider);
  if (!usdc) return BigInt(0);

  const config = getEscrowConfig();
  if (!config) return BigInt(0);

  return await usdc.allowance(ownerAddress, config.contractAddress);
}

/** Check USDC balance for an address. */
export async function getUSDCBalance(
  provider: ethers.Provider,
  address: string
): Promise<bigint> {
  const usdc = createUSDCContract(provider);
  if (!usdc) return BigInt(0);
  return await usdc.balanceOf(address);
}

export async function getSignerFromPrivy(
  privyProvider: unknown
): Promise<JsonRpcSigner | null> {
  try {
    const provider = new BrowserProvider(privyProvider as ethers.Eip1193Provider);
    return await provider.getSigner();
  } catch {
    return null;
  }
}

export interface MockEscrowResult {
  success: boolean;
  txHash: string;
  error?: string;
}

export function generateMockTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function generateMockContractItemId(): string {
  return Math.floor(Math.random() * 1000000 + 1).toString();
}

export async function mockCreateEscrow(
  _negotiationId: string,
  _priceUSDC: bigint,
  _buyerAddress: string
): Promise<MockEscrowResult & { contractItemId: string }> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: generateMockTxHash(),
    contractItemId: generateMockContractItemId(),
  };
}

export async function mockDeposit(
  _contractItemId: string
): Promise<MockEscrowResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: generateMockTxHash(),
  };
}

export async function mockConfirm(_contractItemId: string): Promise<MockEscrowResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: generateMockTxHash(),
  };
}

export async function mockFlag(_contractItemId: string): Promise<MockEscrowResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: generateMockTxHash(),
  };
}

export async function mockUpdatePrice(
  _contractItemId: string,
  _topay: bigint
): Promise<MockEscrowResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: generateMockTxHash(),
  };
}
