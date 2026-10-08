with open('src/components/TradingForm.tsx', 'r') as f:
    content = f.read()

start_idx = content.find('<div className="grid grid-cols-1 md:grid-cols-2 gap-6">')
end_idx = content.find('</Card>', content.find('{/* 4. Abstracted Execution Route */}')) + 7
# We need to also remove the closing div for the grid:
# The structure is:
# <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
#   <Card...Yield>...</Card>
#   <Card...Execution>...</Card>
# </div>

end_div_idx = content.find('</div>', end_idx) + 6

# Remove the block
content = content[:start_idx] + content[end_div_idx:]

with open('src/components/TradingForm.tsx', 'w') as f:
    f.write(content)

print("Removed cards")
