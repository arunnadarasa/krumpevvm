/**
 * Staking Contract ABI
 * Constructor: (initialAdmin, initialGoldenFisher)
 */
export const STAKING_ABI = [{"type":"constructor","inputs":[{"name":"initialAdmin","type":"address","internalType":"address"},{"name":"initialGoldenFisher","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},{"type":"function","name":"_setupEstimatorAndEvvm","inputs":[{"name":"_estimator","type":"address","internalType":"address"},{"name":"_evvm","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"}] as const;

export const STAKING_BYTECODE = '0x60803460ba57601f61354f38819003918201601f19168301916001600160401b0383118484101760be57808492604094855283398101031260ba57604b602060458360d2565b920160d2565b9060018060a01b031660018060a01b0319600254161760025560018060a01b031660018060a01b03196005541617600555600160ff19601354161760135560ff19601154166011555f600b55621baf80600e55600160ff19601a541617601a5560405161346990816100e68239f35b5f80fd5b634e487b7160e01b5f52604160045260245ffd5b51906001600160a01b038216820360ba5756fe' as `0x${string}`;
