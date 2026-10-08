import { defineConfig, Plugin, ContractConfig } from '@wagmi/cli'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

// Helper to recursively find .json files
function findJsonFiles(dir: string, fileList: string[] = []) {
  try {
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        findJsonFiles(path.join(dir, file.name), fileList);
      } else if (file.name.endsWith('.json') && !file.name.endsWith('.dbg.json')) {
        fileList.push(path.join(dir, file.name));
      }
    }
  } catch (e) {
    // Ignore errors if directory doesn't exist
  }
  return fileList;
}

function parseContract(filePath: string): ContractConfig | undefined {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (data.abi && data.abi.length > 0 && data.contractName) {
      return {
        name: data.contractName,
        abi: data.abi,
      };
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return undefined;
}

function localArtifactsPlugin(): Plugin {
  const artifactsDir = path.resolve('artifacts/contracts');

  return {
    name: 'Local Artifacts Watcher',
    contracts() {
      const contracts: ContractConfig[] = [];
      const files = findJsonFiles(artifactsDir);
      for (const file of files) {
        const contract = parseContract(file);
        if (contract) contracts.push(contract);
      }
      return contracts;
    },
    watch: {
      paths: [
        path.join(artifactsDir, '**/*.json')
      ],
      async onChange(filePath) {
        return parseContract(filePath);
      },
      async onAdd(filePath) {
        return parseContract(filePath);
      },
      async onRemove(filePath) {
        const fileName = path.basename(filePath, '.json');
        return fileName; // returning the contract name removes it
      }
    }
  }
}

export default defineConfig({
  out: 'config/generated.ts',
  plugins: [
    localArtifactsPlugin(),
  ],
})
