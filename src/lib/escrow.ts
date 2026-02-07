import { ethers, Contract, BrowserProvider, JsonRpcSigner } from 'ethers';

const DEFAULT_ABI = [
  'function create(bytes32 itemId, uint256 price, address buyer) external',
  'function deposit() external payable',
  'function confirm() external',
  'function flag() external',
  'function updatePrice(uint256 newPrice) external',
  'function getEscrow(bytes32 itemId) view returns (address seller, address buyer, uint256 price, uint8 status)',
  'event EscrowCreated(bytes32 indexed itemId, address seller, address buyer, uint256 price)',
  'event Deposited(bytes32 indexed itemId, uint256 amount)',
  'event Confirmed(bytes32 indexed itemId)',
  'event Flagged(bytes32 indexed itemId)',
  'event PriceUpdated(bytes32 indexed itemId, uint256 oldPrice, uint256 newPrice)',
];

export type EscrowStatus = 'none' | 'created' | 'funded' | 'confirmed' | 'flagged' | 'resolved';

export interface EscrowInfo {
  seller: string;
  buyer: string;
  price: bigint;
  status: EscrowStatus;
}

export interface EscrowConfig {
  contractAddress: string;
  abi?: string;
}

function getStatusFromNumber(status: number): EscrowStatus {
  const statuses: EscrowStatus[] = ['none', 'created', 'funded', 'confirmed', 'flagged', 'resolved'];
  return statuses[status] || 'none';
}

function listingIdToBytes32(listingId: string): string {
  const hex = listingId.replace(/-/g, '');
  return '0x' + hex.padEnd(64, '0');
}

export function getEscrowConfig(): EscrowConfig | null {
  const contractAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS ||
    process.env.ESCROW_CONTRACT_ADDRESS;

  if (!contractAddress) {
    return null;
  }

  const abiJson = process.env.NEXT_PUBLIC_ESCROW_ABI_JSON ||
    process.env.ESCROW_ABI_JSON;

  return {
    contractAddress,
    abi: abiJson,
  };
}

export function isEscrowConfigured(): boolean {
  return getEscrowConfig() !== null;
}

export function createEscrowContract(
  signerOrProvider: JsonRpcSigner | ethers.Provider
): Contract | null {
  const config = getEscrowConfig();
  if (!config) return null;

  let abi: ethers.InterfaceAbi;
  try {
    abi = config.abi ? JSON.parse(config.abi) : DEFAULT_ABI;
  } catch {
    abi = DEFAULT_ABI;
  }

  return new Contract(config.contractAddress, abi, signerOrProvider);
}

export async function createEscrow(
  signer: JsonRpcSigner,
  listingId: string,
  priceWei: bigint,
  buyerAddress: string
): Promise<string> {
  const contract = createEscrowContract(signer);
  if (!contract) throw new Error('Escrow contract not configured');

  const itemId = listingIdToBytes32(listingId);
  const tx = await contract.create(itemId, priceWei, buyerAddress);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function depositToEscrow(
  signer: JsonRpcSigner,
  listingId: string,
  amountWei: bigint
): Promise<string> {
  const contract = createEscrowContract(signer);
  if (!contract) throw new Error('Escrow contract not configured');

  const tx = await contract.deposit({ value: amountWei });
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function confirmDelivery(
  signer: JsonRpcSigner,
  _listingId: string
): Promise<string> {
  const contract = createEscrowContract(signer);
  if (!contract) throw new Error('Escrow contract not configured');

  const tx = await contract.confirm();
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function flagIssue(
  signer: JsonRpcSigner,
  _listingId: string
): Promise<string> {
  const contract = createEscrowContract(signer);
  if (!contract) throw new Error('Escrow contract not configured');

  const tx = await contract.flag();
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function updatePrice(
  signer: JsonRpcSigner,
  _listingId: string,
  newPriceWei: bigint
): Promise<string> {
  const contract = createEscrowContract(signer);
  if (!contract) throw new Error('Escrow contract not configured');

  const tx = await contract.updatePrice(newPriceWei);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getEscrowInfo(
  provider: ethers.Provider,
  listingId: string
): Promise<EscrowInfo | null> {
  const contract = createEscrowContract(provider);
  if (!contract) return null;

  try {
    const itemId = listingIdToBytes32(listingId);
    const result = await contract.getEscrow(itemId);
    return {
      seller: result[0],
      buyer: result[1],
      price: result[2],
      status: getStatusFromNumber(Number(result[3])),
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

export async function mockCreateEscrow(
  listingId: string,
  priceWei: bigint,
  buyerAddress: string
): Promise<MockEscrowResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: generateMockTxHash(),
  };
}

export async function mockDeposit(
  listingId: string,
  amountWei: bigint
): Promise<MockEscrowResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: generateMockTxHash(),
  };
}

export async function mockConfirm(listingId: string): Promise<MockEscrowResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: generateMockTxHash(),
  };
}

export async function mockFlag(listingId: string): Promise<MockEscrowResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: generateMockTxHash(),
  };
}

export async function mockUpdatePrice(
  listingId: string,
  newPriceWei: bigint
): Promise<MockEscrowResult> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return {
    success: true,
    txHash: generateMockTxHash(),
  };
}
