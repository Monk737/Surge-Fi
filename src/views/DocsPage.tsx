import React from 'react';
import { Card } from '../components/ui/Card';
import { BookOpen, ShieldAlert, Zap, Banknote, Activity, Layers, ArrowRight, HelpCircle, AlertTriangle, Coins, BarChart3, Lock, Wallet, RefreshCw, Scale, Info } from 'lucide-react';

export const DocsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      
      {/* Header */}
      <div className="text-center py-10 border-b-2 border-dashed border-gray-300">
        <h1 className="text-5xl font-black text-black mb-4 uppercase tracking-tighter">Documentation</h1>
        <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto">
          The complete guide to understanding Surge Finance's one-click leverage protocol, risks, and mechanics.
        </p>
      </div>

      {/* 1. Introduction */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-black" />
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">Introduction</h2>
        </div>
        <Card className="bg-white">
          <p className="text-lg text-gray-800 leading-relaxed font-medium mb-4">
            Surge Finance is a decentralized application (dApp) designed to democratize access to institutional-grade financial tools. Traditionally, obtaining leverage involves depositing collateral into a lending protocol, borrowing an asset, swapping it, and repeating the loop manually.
          </p>
          <p className="text-lg text-gray-800 leading-relaxed font-medium">
            Surge Finance automates this entire process into a single transaction using <strong>Flash Loans</strong>. This allows users to open long or short positions with up to 4x leverage instantly.
          </p>
        </Card>
      </section>

      {/* 2. Key Features */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-black" />
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">Key Features</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white">
                <h3 className="text-xl font-bold mb-2">One-Click Leverage</h3>
                <p className="text-gray-600">Skip the 5+ steps usually required. We bundle flash loans, swaps, and lending into one atomic transaction.</p>
            </Card>
            <Card className="bg-white">
                <h3 className="text-xl font-bold mb-2">Long & Short</h3>
                <p className="text-gray-600">Profit from both market directions. Long WETH with USDC, or Short WETH against USDC.</p>
            </Card>
             <Card className="bg-white">
                <h3 className="text-xl font-bold mb-2">Gas Efficient</h3>
                <p className="text-gray-600">By combining steps, you save significantly on gas fees compared to executing manual loops.</p>
            </Card>
             <Card className="bg-white">
                <h3 className="text-xl font-bold mb-2">Self-Custodial</h3>
                <p className="text-gray-600">You retain ownership of your position. The protocol acts as a proxy to facilitate the transaction.</p>
            </Card>
        </div>
      </section>

      {/* 3. Mechanism */}
      <section className="space-y-6">
         <div className="flex items-center gap-3">
          <Layers className="w-8 h-8 text-black" />
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">The Mechanism</h2>
        </div>
        
        {/* Long Position Example */}
        <Card className="bg-slate-50 border-black">
          <h3 className="text-xl font-bold text-black mb-6">Long WETH (Example 3x Leverage)</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-xl shadow-neo-sm">
              <div className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <h4 className="font-bold text-black text-lg">Supply Collateral (USDC)</h4>
                <p className="text-gray-600 font-medium">User provides <strong>1,000 USDC</strong>.</p>
              </div>
            </div>
            
             <div className="flex justify-center">
               <ArrowRight className="w-6 h-6 text-gray-400 transform rotate-90" />
             </div>

            <div className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-xl shadow-neo-sm">
              <div className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <h4 className="font-bold text-black text-lg">Flash Loan USDC</h4>
                <p className="text-gray-600 font-medium">Protocol flash loans <strong>2,000 USDC</strong> from Balancer (Total 3,000 USDC).</p>
              </div>
            </div>

            <div className="flex justify-center">
               <ArrowRight className="w-6 h-6 text-gray-400 transform rotate-90" />
             </div>

            <div className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-xl shadow-neo-sm">
              <div className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <h4 className="font-bold text-black text-lg">Swap & Supply</h4>
                <p className="text-gray-600 font-medium">Swap 3,000 USDC to <strong>WETH</strong>. Supply WETH to Aave.</p>
              </div>
            </div>

             <div className="flex justify-center">
               <ArrowRight className="w-6 h-6 text-gray-400 transform rotate-90" />
             </div>

             <div className="flex items-start gap-4 p-4 bg-emerald-50 border-2 border-emerald-600 rounded-xl shadow-neo-sm">
              <div className="bg-emerald-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
              <div>
                <h4 className="font-bold text-emerald-900 text-lg">Borrow & Repay</h4>
                <p className="text-emerald-800 font-medium">Borrow <strong>2,000 USDC</strong> from Aave against the WETH. Repay the Flash Loan.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Short Position Example */}
        <Card className="bg-slate-50 border-black">
          <h3 className="text-xl font-bold text-black mb-6">Short WETH (Example 3x Leverage)</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-xl shadow-neo-sm">
              <div className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <h4 className="font-bold text-black text-lg">Supply Collateral (WETH)</h4>
                <p className="text-gray-600 font-medium">User provides <strong>1 WETH</strong>.</p>
              </div>
            </div>
            
             <div className="flex justify-center">
               <ArrowRight className="w-6 h-6 text-gray-400 transform rotate-90" />
             </div>

            <div className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-xl shadow-neo-sm">
              <div className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <h4 className="font-bold text-black text-lg">Flash Loan WETH</h4>
                <p className="text-gray-600 font-medium">Protocol flash loans <strong>2 WETH</strong> from Balancer (Total 3 WETH).</p>
              </div>
            </div>

            <div className="flex justify-center">
               <ArrowRight className="w-6 h-6 text-gray-400 transform rotate-90" />
             </div>

             <div className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-xl shadow-neo-sm">
              <div className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <h4 className="font-bold text-black text-lg">Swap & Supply</h4>
                <p className="text-gray-600 font-medium">Swap 3 WETH to <strong>USDC</strong>. Supply USDC to Aave.</p>
              </div>
            </div>

             <div className="flex justify-center">
               <ArrowRight className="w-6 h-6 text-gray-400 transform rotate-90" />
             </div>

             <div className="flex items-start gap-4 p-4 bg-rose-50 border-2 border-rose-600 rounded-xl shadow-neo-sm">
              <div className="bg-rose-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
              <div>
                <h4 className="font-bold text-rose-900 text-lg">Borrow & Repay</h4>
                <p className="text-rose-800 font-medium">Borrow <strong>2 WETH</strong> from Aave against the USDC. Repay the Flash Loan.</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. Comprehensive Fee Structure */}
      <section className="space-y-6">
         <div className="flex items-center gap-3">
          <Banknote className="w-8 h-8 text-black" />
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">Fee Structure</h2>
        </div>
        <Card className="overflow-hidden">
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Surge Protocol Fees */}
            <div>
               <h3 className="text-lg font-black text-black uppercase mb-4 flex items-center gap-2">
                 <Zap className="w-5 h-5 text-accent fill-current" />
                 Surge Protocol Fees
               </h3>
               <div className="space-y-4">
                 <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                       <span className="font-bold text-black">Opening Fee</span>
                       <span className="font-black text-lg">2.00%</span>
                    </div>
                    <p className="text-xs text-gray-500">Charged on your initial collateral amount. This is a one-time fee to access the protocol.</p>
                 </div>
                 <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                       <span className="font-bold text-black">Closing Fee</span>
                       <span className="font-black text-lg">5.00%</span>
                    </div>
                    <p className="text-xs text-gray-500">Charged <strong>only on profits</strong>. If the trade is flat or a loss, this fee is 0%.</p>
                 </div>
                 <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2 items-start">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 font-medium">
                      Fees will be charged in initial collateral asset for both long and short i.e USDC in Long and WETH in Short.
                    </p>
                 </div>
                 <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2 items-start">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 font-medium">
                      The rates above apply to Standard accounts. Agent-managed accounts (those with a keeper assigned) use a capital-based schedule instead: 6%–15% to open and 10%–15% of profit to close, with a $200 minimum. The trading form always shows the rate that applies to the selected account.
                    </p>
                 </div>
               </div>
            </div>

            {/* External / Third-Party Fees */}
            <div>
               <h3 className="text-lg font-black text-black uppercase mb-4 flex items-center gap-2">
                 <Activity className="w-5 h-5 text-gray-600" />
                 External DeFi Costs
               </h3>
               <div className="space-y-4">
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                       <span className="font-bold text-gray-700">Balancer Flash Loan</span>
                       <span className="font-bold font-mono">0.09%</span>
                    </div>
                    <p className="text-xs text-gray-500">Applied to the total borrowed amount (leverage portion only).</p>
                 </div>
                 <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                       <span className="font-bold text-gray-700">Aave Borrow Rate</span>
                       <span className="font-bold font-mono">Variable APY</span>
                    </div>
                    <p className="text-xs text-gray-500">Interest accrues continuously on debt based on Aave's utilization rates.</p>
                 </div>
                 <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                       <span className="font-bold text-gray-700">Swap Fees</span>
                       <span className="font-bold font-mono">~0.05% - 0.3%</span>
                    </div>
                    <p className="text-xs text-gray-500">Standard liquidity provider fees embedded in the DEX price during swaps.</p>
                 </div>
               </div>
            </div>

          </div>
        </Card>
      </section>

      {/* 5. Risks */}
       <section className="space-y-6">
         <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-black" />
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">Risk Factors</h2>
        </div>
        <Card className="bg-rose-50 border-rose-200">
           <div className="space-y-4">
              <div className="flex gap-3">
                 <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                 <div>
                    <h3 className="font-bold text-rose-900">Liquidation Risk</h3>
                    <p className="text-rose-800 text-sm">If your health factor drops below 1.0, your position will be liquidated by Aave. Surge Finance provides a buffer, but volatile markets can move quickly.</p>
                 </div>
              </div>
               <div className="flex gap-3">
                 <Activity className="w-6 h-6 text-rose-600 flex-shrink-0" />
                 <div>
                    <h3 className="font-bold text-rose-900">Smart Contract Risk</h3>
                    <p className="text-rose-800 text-sm">While we use audited external protocols (Aave, Balancer), there is always a non-zero risk of bugs in smart contracts.</p>
                 </div>
              </div>
           </div>
        </Card>
      </section>

       {/* 6. 
      {/* 4. Health Factor & Risk Management */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-black" />
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">⚖ Health Factor & Risk Management</h2>
        </div>

        {/* Block 1: What is Health Factor? */}
        <Card className="bg-white">
          <h3 className="text-xl font-bold mb-4">What is Health Factor?</h3>
          <p className="text-gray-600 mb-4">
            Your Health Factor (HF) is Aave's real-time measure of your position's safety. It compares the USD value of your collateral (adjusted for liquidation threshold) against your outstanding debt. A higher HF means your position is further from liquidation.
          </p>
          <div className="bg-gray-50 border-2 border-black p-4 font-mono text-sm shadow-neo-sm">
            <div className="font-bold mb-2">Health Factor = (Collateral USD × Liquidation Threshold) ÷ Debt USD</div>
            <div className="text-gray-500 mb-1">Example — LONG 2× with $1,000 USDC:</div>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Flash borrows $1,000 USDC → swaps $2,000 total → $2,000 WETH collateral</li>
              <li>Aave debt: $1,000 USDC</li>
              <li>HF = ($2,000 × 0.825) ÷ $1,000 = 1.65 ✅ SAFE</li>
            </ul>
          </div>
        </Card>

        {/* Block 2: HF Zone Table */}
        <Card className="bg-white">
          <h3 className="text-xl font-bold mb-4">HF Zone Table</h3>
          <div className="overflow-x-auto border-2 border-black shadow-neo-sm">
            <table className="w-full text-left font-mono text-sm">
              <thead className="bg-black text-white">
                <tr>
                  <th className="p-3 border-r-2 border-black">HF Range</th>
                  <th className="p-3 border-r-2 border-black">Risk Level</th>
                  <th className="p-3 border-r-2 border-black">What It Means</th>
                  <th className="p-3">What To Do</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-green-100 border-b-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">≥ 1.50</td>
                  <td className="p-3 border-r-2 border-black text-green-800 font-bold">✓ SAFE</td>
                  <td className="p-3 border-r-2 border-black">Well-collateralised. No risk.</td>
                  <td className="p-3">Monitor normally</td>
                </tr>
                <tr className="bg-amber-100 border-b-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">1.25–1.50</td>
                  <td className="p-3 border-r-2 border-black text-amber-800 font-bold">⚠ WARNING</td>
                  <td className="p-3 border-r-2 border-black">Approaching critical zone.</td>
                  <td className="p-3">Add collateral</td>
                </tr>
                <tr className="bg-orange-100 border-b-2 border-black">
                  <td className="p-3 border-r-2 border-black font-bold">1.00–1.25</td>
                  <td className="p-3 border-r-2 border-black text-orange-800 font-bold">⚡ CRITICAL</td>
                  <td className="p-3 border-r-2 border-black">Emergency close available.</td>
                  <td className="p-3 text-red-600 font-bold">Close or add ASAP</td>
                </tr>
                <tr className="bg-red-100">
                  <td className="p-3 border-r-2 border-black font-bold">&lt; 1.00</td>
                  <td className="p-3 border-r-2 border-black text-red-800 font-bold">🔴 LIQUIDAT.</td>
                  <td className="p-3 border-r-2 border-black">Aave bots can liquidate now.</td>
                  <td className="p-3 text-red-800 font-black">Act immediately</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Block 3: Liquidation Mechanics */}
        <Card className="bg-white">
          <h3 className="text-xl font-bold mb-4">Liquidation Mechanics</h3>
          <p className="text-gray-600 mb-4">
            When your HF drops below 1.0, Aave allows third-party liquidators to repay up to your maxLiquidatablePercent of your debt in exchange for your collateral at a 5% discount. This means you lose more than if you had closed the position yourself.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600 font-medium">
            <li>Liquidation happens at HF &lt; 1.0 — not at 1.25</li>
            <li>A 5% liquidation bonus incentivises bots — you lose 5% extra on liquidated portion</li>
            <li>You can be partially liquidated (not always 100%)</li>
            <li><code>getMaxLiquidatablePercent()</code> shows exactly what % is at risk right now</li>
            <li>Liquidation bots operate on every block — no grace period</li>
          </ul>
        </Card>

        {/* Block 4: LONG vs SHORT Risk Asymmetry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-emerald-50 border-2 border-black shadow-neo-sm">
            <h3 className="text-xl font-black mb-4">LONG Position</h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="font-bold text-gray-700">Collateral: <span className="text-black">WETH (liqThresh: 82.5%)</span></div>
              <div className="font-bold text-gray-700 mb-4">Debt: <span className="text-black">USDC (stable)</span></div>
              
              <div className="text-rose-600 font-bold">Your HF falls when ETH price FALLS.</div>
              <div className="bg-white p-2 border border-black my-2">Liquidation price = ETH price / HF</div>
              
              <div className="text-gray-600 mt-4">
                <div>E.g. at 2× LONG, HF=1.65:</div>
                <ul className="list-disc pl-4 mt-1">
                  <li>liqPrice = current / 1.65</li>
                  <li>If ETH = $3,000: liq at $1,818</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="bg-rose-50 border-2 border-black shadow-neo-sm">
            <h3 className="text-xl font-black mb-4">SHORT Position</h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="font-bold text-gray-700">Collateral: <span className="text-black">USDC (liqThresh: 77.0%)</span></div>
              <div className="font-bold text-gray-700 mb-4">Debt: <span className="text-black">WETH (volatile)</span></div>
              
              <div className="text-rose-600 font-bold">Your HF falls when ETH price RISES.</div>
              <div className="bg-white p-2 border border-black my-2">Liquidation price = ETH price × HF</div>
              
              <div className="text-gray-600 mt-4">
                <div>E.g. at 2× SHORT, HF=1.54:</div>
                <ul className="list-disc pl-4 mt-1">
                  <li>liqPrice = current × 1.54</li>
                  <li>If ETH = $3,000: liq at $4,620</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 font-bold text-blue-800 text-sm">
          SHORT positions have LOWER liqThreshold (77% vs 82.5%) meaning they need slightly lower leverage to achieve the same HF safety buffer.
        </div>

        {/* Block 5: emergencyClose Explained */}
        <Card className="bg-white">
          <h3 className="text-xl font-bold mb-4">emergencyClose Explained</h3>
          <p className="text-gray-600 mb-4">
            The <code>emergencyClose()</code> function becomes available when your HF drops below 1.25 (the <code>HF_MINIMUM_POST_OPEN</code> threshold). Unlike normal close, it sets <code>minProfit = 1</code> (accepts any swap output) to maximise speed of exit. Use it when:
          </p>
          <ul className="space-y-2 font-medium">
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> HF is between 1.0 and 1.25 (CRITICAL zone) and you cannot add collateral</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> HF is below 1.0 (LIQUIDATABLE) and you want to recover any remaining equity</li>
            <li className="flex items-center gap-2 text-amber-600"><span className="font-bold">⚠</span> Do NOT use if you can still close normally — normal close has MEV protection</li>
          </ul>
        </Card>

        {/* Block 6: How to Improve Your HF */}
        <Card className="bg-white">
          <h3 className="text-xl font-bold mb-4">How to Improve Your HF</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 border-2 border-black p-4 shadow-neo-sm">
              <h4 className="font-black mb-2 text-lg">A. Supply More Collateral</h4>
              <ol className="list-decimal pl-4 space-y-1 text-sm text-gray-600 font-medium">
                <li>Get the suggested top-up amount from the "Add Collateral" panel</li>
                <li>Call <code>supplyToAave(asset, amount)</code> from your position</li>
                <li>HF increases proportionally</li>
              </ol>
            </div>
            <div className="bg-gray-50 border-2 border-black p-4 shadow-neo-sm">
              <h4 className="font-black mb-2 text-lg">B. Repay Part of Debt</h4>
              <ol className="list-decimal pl-4 space-y-1 text-sm text-gray-600 font-medium">
                <li><code>withdrawFromAave</code> the debt token</li>
                <li>Use <code>withdrawTokens</code> to pull funds</li>
                <li>Call repay manually on Aave (outside this app)</li>
              </ol>
            </div>
            <div className="bg-gray-50 border-2 border-black p-4 shadow-neo-sm">
              <h4 className="font-black mb-2 text-lg">C. Close Position</h4>
              <ol className="list-decimal pl-4 space-y-1 text-sm text-gray-600 font-medium">
                <li>Use normal <code>closePosition()</code> when HF ≥ 1.25</li>
                <li>Use <code>emergencyClose()</code> only when HF &lt; 1.25</li>
              </ol>
            </div>
          </div>
        </Card>

        {/* Block 7: Max Leverage Quick Reference */}
        <Card className="bg-white">
          <h3 className="text-xl font-bold mb-4">Max Leverage Quick Reference</h3>
          <div className="overflow-x-auto border-2 border-black shadow-neo-sm mb-4">
            <table className="w-full text-center font-mono text-sm">
              <thead className="bg-black text-white">
                <tr>
                  <th className="p-3 border-r-2 border-black">Direction</th>
                  <th className="p-3 border-r-2 border-black">Liq. Threshold</th>
                  <th className="p-3 border-r-2 border-black">Max Safe Leverage (HF≥1.25)</th>
                  <th className="p-3">Recommended</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b-2 border-black bg-emerald-50">
                  <td className="p-3 border-r-2 border-black font-bold">LONG (WETH)</td>
                  <td className="p-3 border-r-2 border-black">82.5%</td>
                  <td className="p-3 border-r-2 border-black font-bold">≈ 2.94×</td>
                  <td className="p-3 text-emerald-700 font-bold">2.0–2.5×</td>
                </tr>
                <tr className="bg-rose-50">
                  <td className="p-3 border-r-2 border-black font-bold">SHORT (USDC)</td>
                  <td className="p-3 border-r-2 border-black">77.0%</td>
                  <td className="p-3 border-r-2 border-black font-bold">≈ 2.49×</td>
                  <td className="p-3 text-rose-700 font-bold">1.8–2.2×</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-sm text-gray-500 font-bold">
            Note: These are theoretical maxima. Surge enforces HF ≥ 1.25 at open. Using safeFlashLoan (from getMaxFlashLoan) keeps you within safe bounds.
          </div>
        </Card>

      </section>

{/* FAQ (Expanded) */}
      <section className="space-y-6">
         <div className="flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-black" />
          <h2 className="text-3xl font-black text-black uppercase tracking-tight">FAQ</h2>
        </div>
        <div className="space-y-4">
           {/* Existing + New */}
           
           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2">My HF was 1.5 when I opened. Why has it changed?</h3>
              <p className="text-gray-600">HF changes continuously as the ETH price moves. LONG: HF = f(ETH price↑) — HF rises with ETH. SHORT: HF = f(ETH price↓) — HF rises when ETH falls.</p>
           </Card>
           
           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2">Can my position be liquidated even if I'm watching it?</h3>
              <p className="text-gray-600">Yes. Aave liquidation is permissionless and bots run on every block (~12 seconds). There is no warning period below HF 1.0.</p>
           </Card>
           
           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2">What is the difference between WARNING and CRITICAL?</h3>
              <p className="text-gray-600">WARNING (HF 1.25–1.5): position is valid, no emergency close available. CRITICAL (HF 1.0–1.25): emergency close becomes available (HF_MINIMUM_POST_OPEN = 1.25). Both are below the SAFE zone — you should act.</p>
           </Card>
           
           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2">Why does the contract prevent opening with HF &lt; 1.25?</h3>
              <p className="text-gray-600">To protect users. Opening with low HF means any small adverse price move immediately puts the position in the CRITICAL zone. The 1.25 minimum gives a safety buffer before emergency close is needed.</p>
           </Card>
           
<Card className="bg-white">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Lock className="w-4 h-4 text-gray-400"/> What happens if I get liquidated?</h3>
              <p className="text-gray-600">If your position reaches the liquidation price, Aave liquidators will sell your collateral to repay the debt. You may lose all of your initial collateral.</p>
           </Card>
           
           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2">Can I top up my collateral?</h3>
              <p className="text-gray-600">Currently, Surge Finance does not support collateral top-ups on active positions. To manage risk, you would need to close the position and open a new one with adjusted parameters.</p>
           </Card>

           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2">Where does the liquidity come from?</h3>
              <p className="text-gray-600">Surge Finance acts as an aggregator layer. We utilize <strong>Balancer</strong> for flash loans and <strong>Aave V3</strong> for the underlying lending and borrowing markets. This ensures deep liquidity and competitive rates without Surge Finance holding a proprietary liquidity pool.</p>
           </Card>

           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gray-400"/> How is interest charged?</h3>
              <p className="text-gray-600">Interest is charged on the borrowed portion of your position (e.g., the USDC borrowed against your ETH collateral in a Long position). This rate is variable and determined by Aave's supply/demand mechanics. It accrues every block and is reflected in a slowly increasing debt value, which slightly raises your liquidation price over time.</p>
           </Card>

           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2">Is there a lock-up period?</h3>
              <p className="text-gray-600">No. You can close your position at any block (approx. every 12 seconds on Ethereum), provided there is sufficient market liquidity. There are no time-based penalties for closing early.</p>
           </Card>

            <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2">Why do I deposit WETH for a 'Short w/ USDC' position?</h3>
              <p className="text-gray-600">To maintain a trustless single-transaction architecture, you must deposit the exact ERC-20 asset you intend to borrow as your initial capital. For example, to Short WETH, you deposit WETH. The protocol flash-borrows more WETH, swaps the entire combined WETH amount into USDC, supplies that USDC to Aave (hence 'Short w/ USDC'), and finally borrows WETH against it to repay the flash loan. This creates a net short exposure to WETH price movements while keeping your actual collateral safely inside Aave in stablecoins.</p>
           </Card>

           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Coins className="w-4 h-4 text-gray-400"/> Why are gas fees higher than a normal swap?</h3>
              <p className="text-gray-600">Opening a position involves interacting with multiple protocols in one transaction: a Flash Loan, a Token Swap, depositing into Aave, and borrowing from Aave. This complexity requires more computational power (gas) from the Ethereum network than a simple token transfer or swap.</p>
           </Card>

           {/* 5 New FAQs */}
           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-gray-400"/> Are the smart contracts audited?</h3>
              <p className="text-gray-600">Surge Finance relies on battle-tested protocols like Aave V3 and Balancer for underlying mechanics. Our core proxy contracts utilize standard patterns and have been internally tested to ensure funds remain self-custodial throughout the flash loan transaction.</p>
           </Card>

           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Scale className="w-4 h-4 text-gray-400"/> How is slippage handled?</h3>
              <p className="text-gray-600">During the position creation, large swaps occur (e.g., swapping borrowed USDC for WETH). We enforce a default slippage protection (typically 0.5%) via DEX aggregators to protect you from sandwich attacks and poor execution prices.</p>
           </Card>

           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Wallet className="w-4 h-4 text-gray-400"/> Which wallets are supported?</h3>
              <p className="text-gray-600">We support all major EVM-compatible wallets including MetaMask, Rainbow, Coinbase Wallet, and WalletConnect compatible mobile wallets.</p>
           </Card>

           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-400"/> What is the Emergency Pause feature?</h3>
              <p className="text-gray-600">The protocol has a <strong>Pause</strong> switch held by the protocol owner (a multisig) and its pause guardian. It is meant for extreme market volatility, flash crash events, or suspected oracle manipulation. While the protocol is paused, no new accounts can be created and no new positions can be opened. Existing positions are not locked: you can still close, emergency-close, and withdraw your funds at any time.</p>
           </Card>

           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-amber-400"/> What is the Health Factor?</h3>
              <p className="text-gray-600">The <strong>Health Factor (HF)</strong> represents the safety of your position. A Health Factor above 1.5 is considered SAFE. Below 1.5 is WARNING, below 1.1 is CRITICAL, and 1.0 or below means your position is LIQUIDATABLE. We pull this data dynamically from Aave to accurately represent your real-time risk level based on live Chainlink price feeds.</p>
           </Card>

           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-gray-400"/> Will more assets be added?</h3>
              <p className="text-gray-600">Currently, we focus on ETH/USDC for maximum liquidity and stability. We plan to add WBTC and other high-cap assets once lending liquidity on Aave V3 is sufficient to support flash-leveraged positions safely.</p>
           </Card>

           <Card className="bg-white">
              <h3 className="font-bold text-lg mb-2">Can I take partial profits?</h3>
              <p className="text-gray-600">Not in the current version (V1). To realize profits, you must close the entire position. Partial closing and collateral adjustment features are planned for future version to allow more flexible trade management.</p>
           </Card>
        </div>
      </section>
    </div>
  );
};