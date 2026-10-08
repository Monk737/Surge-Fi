with open('src/components/TradingForm.tsx', 'r') as f:
    content = f.read()

# Locate blocks
pnl_end = content.find('</Card>', content.find('{/* Right Column: Visualization */}')) + 7

surge_start = content.find('{/* 1. Surge Protection Layer */}')
surge_end = content.find('</Card>', surge_start) + 7

stress_start = content.find('{/* 2. Price Stress Test Matrix */}')
stress_end = content.find('</Card>', stress_start) + 7

if surge_start == -1 or stress_start == -1:
    print("Could not find sections")
    exit(1)

# Extract blocks
surge_block = content[surge_start:surge_end]
stress_block = content[stress_start:stress_end]

# Modify the Price Stress Test block to use the yellow/black hero style
# In the <Card> definition
# currently: <Card title={<span ...>Price Stress Test <InfoTooltip .../></span>} className="bg-slate-50">
stress_block = stress_block.replace(
    'className="bg-slate-50"',
    'className="bg-[#FFB800] border-4 border-black shadow-[6px_6px_0px_0px_#000]"'
)
# Make the inner table wrapper match better
stress_block = stress_block.replace(
    'className="overflow-x-auto border-2 border-black rounded shadow-neo-sm bg-white"',
    'className="overflow-x-auto border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] bg-white"'
)

# Also rename the comment numbers so they make sense, but it doesn't really matter.
stress_block = stress_block.replace('{/* 2. Price Stress Test Matrix */}', '{/* 1. Price Stress Test Matrix (HERO) */}')
surge_block = surge_block.replace('{/* 1. Surge Protection Layer */}', '{/* 2. Surge Protection Layer */}')

# Now construct the new content
before = content[:surge_start]
after = content[stress_end:]

new_content = before + stress_block + "\n\n        " + surge_block + after

with open('src/components/TradingForm.tsx', 'w') as f:
    f.write(new_content)

print("Swapped and restyled.")
