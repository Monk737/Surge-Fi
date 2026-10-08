import { getAbiItem } from 'viem';
import { POSITION_ABI } from './PositionABI';

// Event definitions for getLogs, taken from the ABI so they cannot drift from it.
export const POSITION_OPENED_EVENT   = getAbiItem({ abi: POSITION_ABI, name: "PositionOpened" });
export const POSITION_REOPENED_EVENT = getAbiItem({ abi: POSITION_ABI, name: "PositionReopened" });
export const POSITION_CLOSED_EVENT   = getAbiItem({ abi: POSITION_ABI, name: "PositionClosed" });
export const PROTOCOL_FEE_EVENT      = getAbiItem({ abi: POSITION_ABI, name: "ProtocolFeeCollected" });
