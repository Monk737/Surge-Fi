import re

with open("src/components/RealPositionView.tsx", "r") as f:
    content = f.read()

# Replace the Actions block
old_actions = """      {/* 4. ACTIONS */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t-2 border-gray-200">
        
        {status === 1 && (
          <>
            <div className="flex items-center gap-2 mr-auto">
              <input 
                type="number" 
                placeholder={positionDirection === "LONG" ? "Min USDC profit" : "Min WETH profit"}
                value={minProfit}
                onChange={(e) => setMinProfit(e.target.value)}
                className="w-36 text-sm border-2 border-black rounded px-3 py-2 font-mono outline-none focus:border-accent"
              />
              <select 
                value={poolFee} 
                onChange={(e) => setPoolFee(Number(e.target.value) as PoolFeeValue)}
                className="text-sm border-2 border-black rounded px-3 py-2 font-bold outline-none cursor-pointer"
              >
                {Object.entries(POOL_FEE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Button onClick={handleClose} disabled={isWriting}>Close Position</Button>
            </div>
            
            {isPaused ? (
              <Button variant="success" onClick={unpause} disabled={isWriting}>Unpause</Button>
            ) : (
              <Button variant="danger" onClick={pause} disabled={isWriting}>Pause</Button>
            )}

            {/* 6. EMERGENCY CLOSE */}
            {status === 1 && (riskLevel === 2 || riskLevel === 3 || showEmergencyClose) && (
              <div className="w-full mt-4 p-4 border-2 border-red-500 bg-red-50">
                <div className="font-bold text-red-600 mb-2">⚡ Emergency Close Available</div>
                <div className="text-sm text-red-800 mb-2 font-mono">
                  Current HF: {formatHF(healthFactor)} — Below the 1.25 minimum threshold.
                </div>
                <div className="text-sm text-red-800 mb-4">
                  Warning: This bypasses MEV protection (minProfit = 1). Normal close is preferred if not liquidatable.
                </div>
                {riskLevel === 3 && (
                  <div className="font-bold text-red-600 mb-4 animate-pulse">
                    🔴 HF < 1.0. Aave bots may liquidate before your tx confirms. Emergency close as fast as possible.
                  </div>
                )}
                <Button variant="danger" onClick={handleEmergencyClose} disabled={isWriting} className="w-full animate-pulse shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all">
                  ⚠ EMERGENCY CLOSE NOW
                </Button>
              </div>
            )}
            
            {status === 1 && !(riskLevel === 2 || riskLevel === 3 || showEmergencyClose) && (
              <button 
                onClick={() => setShowEmergencyClose(true)}
                className="text-xs text-gray-400 font-bold hover:text-black underline"
              >
                Show Emergency Options
              </button>
            )}
          </>
        )}

        {status === 2 && (
          <div className="flex gap-2">
            {usdcBalance > 0n && <Button variant="secondary" onClick={() => withdrawTokens(CONTRACTS.USDC, usdcBalance)} disabled={isWriting}>Withdraw {formatUsdc(usdcBalance)}</Button>}
            {wethBalance > 0n && <Button variant="secondary" onClick={() => withdrawTokens(CONTRACTS.WETH, wethBalance)} disabled={isWriting}>Withdraw {formatWeth(wethBalance)}</Button>}
            <Button variant="secondary" onClick={() => withdrawETH()} disabled={isWriting}>Withdraw ETH</Button>
            <Button variant="secondary" onClick={() => withdrawFromAave(CONTRACTS.USDC)} disabled={isWriting}>Withdraw Aave USDC</Button>
            <Button variant="secondary" onClick={() => withdrawFromAave(CONTRACTS.WETH)} disabled={isWriting}>Withdraw Aave WETH</Button>
          </div>
        )}
      </div>"""

new_actions = """      {/* 4. ACTIONS */}
      <div className="pt-6 border-t-2 border-gray-200">
        
        {status === 1 && (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
               <h4 className="font-bold border-b-2 border-black pb-2 mb-4 uppercase text-sm tracking-widest flex items-center justify-between">
                 Close Position
                 {isPaused ? (
                   <Button variant="success" onClick={unpause} disabled={isWriting} className="py-1 px-2 text-xs">Unpause Proxy</Button>
                 ) : (
                   <Button variant="danger" onClick={pause} disabled={isWriting} className="py-1 px-2 text-xs">Pause Proxy</Button>
                 )}
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                 <div>
                   <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Min. Expected Profit</label>
                   <input 
                     type="number" 
                     placeholder={positionDirection === "LONG" ? "0.00 USDC" : "0.00 WETH"}
                     value={minProfit}
                     onChange={(e) => setMinProfit(e.target.value)}
                     className="w-full text-sm border-2 border-black rounded px-3 py-2 font-mono outline-none focus:border-[#ffe500]"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Swap Fee Tier</label>
                   <select 
                     value={poolFee} 
                     onChange={(e) => setPoolFee(Number(e.target.value) as PoolFeeValue)}
                     className="w-full text-sm border-2 border-black rounded px-3 py-2 font-bold outline-none cursor-pointer bg-white"
                   >
                     {Object.entries(POOL_FEE_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                   </select>
                 </div>
               </div>
               <Button onClick={handleClose} disabled={isWriting} className="w-full py-4 text-lg">Close Position</Button>
            </div>

            {(riskLevel === 2 || riskLevel === 3 || showEmergencyClose) ? (
              <div className="md:w-[40%] p-4 border-2 border-red-500 bg-red-50 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] flex flex-col justify-center">
                <div className="font-bold text-red-600 mb-2 uppercase tracking-wide">⚡ Emergency Close</div>
                <div className="text-xs text-red-800 mb-2 font-mono font-bold bg-white border border-red-200 p-2 rounded">
                  Current HF: {formatHF(healthFactor)}
                </div>
                <div className="text-xs text-red-800 mb-4 leading-relaxed font-medium">
                  Warning: Bypasses MEV protection (minProfit = 1). Normal close is preferred if not liquidatable.
                </div>
                {riskLevel === 3 && (
                  <div className="font-bold text-red-600 mb-4 text-xs animate-pulse">
                    🔴 HF < 1.0. Aave bots may liquidate before your tx confirms. Close NOW.
                  </div>
                )}
                <Button variant="danger" onClick={handleEmergencyClose} disabled={isWriting} className="w-full animate-pulse shadow-[4px_4px_0px_0px_rgba(220,38,38,1)] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] transition-all uppercase tracking-widest mt-auto">
                  Execute Escape
                </Button>
              </div>
            ) : (
              <div className="md:w-[40%] p-4 border-2 border-gray-300 bg-gray-50 border-dashed flex flex-col items-center justify-center text-center">
                <div className="text-sm font-bold text-gray-500 mb-2">Health Factor is Safe</div>
                <button 
                  onClick={() => setShowEmergencyClose(true)}
                  className="text-xs text-gray-400 font-bold hover:text-black underline mt-2 transition-colors"
                >
                  Show Emergency Options
                </button>
              </div>
            )}
          </div>
        )}

        {status === 2 && (
          <div className="flex gap-2 mt-4">
            {usdcBalance > 0n && <Button variant="secondary" onClick={() => withdrawTokens(CONTRACTS.USDC, usdcBalance)} disabled={isWriting}>Withdraw {formatUsdc(usdcBalance)}</Button>}
            {wethBalance > 0n && <Button variant="secondary" onClick={() => withdrawTokens(CONTRACTS.WETH, wethBalance)} disabled={isWriting}>Withdraw {formatWeth(wethBalance)}</Button>}
            <Button variant="secondary" onClick={() => withdrawETH()} disabled={isWriting}>Withdraw ETH</Button>
            <Button variant="secondary" onClick={() => withdrawFromAave(CONTRACTS.USDC)} disabled={isWriting}>Withdraw Aave USDC</Button>
            <Button variant="secondary" onClick={() => withdrawFromAave(CONTRACTS.WETH)} disabled={isWriting}>Withdraw Aave WETH</Button>
          </div>
        )}
      </div>"""

content = content.replace(old_actions, new_actions)

with open("src/components/RealPositionView.tsx", "w") as f:
    f.write(content)
