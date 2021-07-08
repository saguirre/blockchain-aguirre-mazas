const path = require('path');
const fs = require('fs');
const solc = require('solc');

const configPath = path.resolve(process.cwd(), 'config.json');
const projectFolder = process.cwd();
const contractFolderName = 'contracts';
const buildFolderName = 'build';
const contractFileName = 'Tax.sol';
const contractName = contractFileName.replace('.sol', '');
const contractPath = path.resolve(projectFolder, contractFolderName, contractFileName);

const abiPath = path.resolve(projectFolder, buildFolderName, contractName + '_abi.json');
const bytecodePath = path.resolve(projectFolder, buildFolderName, contractName + '_bytecode.json');

const methods = {
    compile() {
        const sourcesContent = {};
        sourcesContent[contractName] = { content: fs.readFileSync(contractPath, 'utf8') };


        const compilerInputs = {
            language: "Solidity",
            sources: sourcesContent,
            settings: {
                optimizer: { "enabled": true, "runs": 200 },
                outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } }
            }
        }

        const compiledContract = JSON.parse(solc.compile(JSON.stringify(compilerInputs)));

        const contract = compiledContract.contracts[contractName][contractName];

        const abi = contract.abi;
        const bytecode = contract.evm;

        fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
        fs.writeFileSync(bytecodePath, JSON.stringify(bytecode, null, 2));
    },
    async deploy() {
        const bytecode = JSON.parse(fs.readFileSync(bytecodePath, 'utf8')).bytecode;
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

        const accounts = await web3.eth.getAccounts();

        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const result = await new web3.eth.Contract(abi).deploy({
                data: '0x' + bytecode.object
            })
                .send({
                    gas: '3000000',
                    from: process.env.ACCOUNT
                });

            config.taxAddress = result.options.address;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        } catch (error) {
            console.log(error);
        }
    },
    getContract() {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

        return new web3.eth.Contract(abi, config.taxAddress);
    }
}

module.exports = { ...methods }