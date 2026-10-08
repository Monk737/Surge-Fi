import re

with open('src/components/TradingForm.tsx', 'r') as f:
    content = f.read()

# 1 & 2: Remove duplicated stats from Summary Stats
# Find the start of the duplicated section
dup_start = content.find('<div className="flex justify-between items-center text-sm">\n              <span className="text-gray-400">Predicted HF</span>')
dup_end = content.find('</div>\n            \n            <div className="flex justify-between items-center text-sm">\n              <span className="text-gray-400">Total Position Size</span>')
if dup_start != -1 and dup_end != -1:
    # Just removing up to the point before 'Total Position Size'
    content = content[:dup_start] + content[dup_end + 20:]
    # +20 to skip the trailing </div> spaces, wait better to use regex

# Let's use regex to reliably strip the duplicated rows
pattern = r'<div className="flex justify-between items-center text-sm">\s*<span className="text-gray-400">Predicted HF</span>.*?Max Safe Leverage</span>.*?</div>\s*</div>'
content = re.sub(pattern, '</div>', content, flags=re.DOTALL)

# 3: Fix sliderMax
content = content.replace("Math.min(sliderAbsoluteMax, maxSafeLev - 0.01)", "Math.min(sliderAbsoluteMax, maxSafeLev)")

# 4: Add Flash Loan Fee
fee_insert_pos = content.find('<div className="flex justify-between text-gray-400">\n                     <span className="flex items-center gap-1">Protocol Fee (2%)</span>')
flash_loan_fee = """<div className="flex justify-between text-gray-400 mb-2">
                     <span className="flex items-center gap-1">Flash Loan Fee <InfoTooltip text="Flash loans are currently subsidized to 0 fees during V1 launch." /></span>
                     <span className="font-mono text-emerald-400 font-bold">Free (V1 Offer)</span>
                  </div>
                  """
if fee_insert_pos != -1:
    content = content[:fee_insert_pos] + flash_loan_fee + content[fee_insert_pos:]

# 5: Tooltips
tooltip_comp = """
const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative flex items-center ml-1">
    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-white text-[10px] font-mono leading-tight rounded-md border border-gray-700 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] text-center">
      {text}
    </div>
  </div>
);
"""
if "const InfoTooltip" not in content:
    form_decl = "export const TradingForm: React.FC<TradingFormProps> = ({"
    content = content.replace(form_decl, tooltip_comp + "\n" + form_decl)

# Add Tooltips to Elements
# Total Position Size
content = content.replace(
    '<span className="text-gray-400">Total Position Size</span>',
    '<span className="text-gray-400 flex items-center">Total Position Size <InfoTooltip text="Your initial capital multiplied by the leverage factor." /></span>'
)
# Est. Liquidation Price
content = content.replace(
    '<span className="text-gray-400">Est. Liquidation Price</span>',
    '<span className="text-gray-400 flex items-center">Est. Liquidation Price <InfoTooltip text="If the asset price reaches this point, Aave will liquidate your collateral." /></span>'
)
# Estimated Risk
content = content.replace(
    '<span className="text-gray-400 font-bold uppercase">Estimated Risk</span>',
    '<span className="text-gray-400 font-bold uppercase flex items-center">Estimated Risk <InfoTooltip text="Combined risk profile factoring in your leverage and market volatility." /></span>'
)
# PnL Simulation Card
content = content.replace(
    '<Card title="PnL Simulation"',
    '<Card title={<span className="flex items-center gap-2">PnL Simulation <InfoTooltip text="Simulated Profit & Loss across different price targets based on your current settings." /></span>}'
)
# Surge Protection Layer Card
content = content.replace(
    '<Card title="Surge Protection Layer"',
    '<Card title={<span className="flex items-center gap-2">Surge Protection Layer <InfoTooltip text="Visual breakdown of how Surge Finance buffers your positions compared to raw Aave liquidation limits." /></span>}'
)
# Price Stress Test Card
content = content.replace(
    '<Card title="Price Stress Test"',
    '<Card title={<span className="flex items-center gap-2">Price Stress Test <InfoTooltip text="Dynamic matrix simulating your Health Factor and PnL against significant immediate market swings." /></span>}'
)
# Yield Economics Card
content = content.replace(
    '<Card title="Yield Economics"',
    '<Card title={<span className="flex items-center gap-2">Yield Economics <InfoTooltip text="Your collateral actively earns supply yield on Aave, natively offsetting the cost of your borrow yield." /></span>}'
)
# Execution Engine Card
content = content.replace(
    '<Card title="Execution Engine"',
    '<Card title={<span className="flex items-center gap-2">Execution Engine <InfoTooltip text="The atomic sequence executed within a single transaction to securely route flash loans and protocol deposits." /></span>}'
)

with open('src/components/TradingForm.tsx', 'w') as f:
    f.write(content)

print("Done")
