require('dotenv').config();
const Web3 = require('web3');
const Web3Utils = require('web3-utils');
const fetch = require('node-fetch');
const assert = require('assert')
const {sendTx, sendRawTx} = require('../src/tx/sendTx');

const {
  USER_ADDRESS,
  USER_ADDRESS_PRIVATE_KEY,
  FOREIGN_BRIDGE_ADDRESS,
  FOREIGN_RPC_URL,
  FOREIGN_MIN_AMOUNT_PER_TX,
  ERC20_ADDRESS,
  NUMBER_OF_DEPOSITS_TO_SEND
} = process.env;

const POA20_ABI = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const foreignProvider = new Web3.providers.HttpProvider(FOREIGN_RPC_URL);
const web3Foreign = new Web3(foreignProvider);

const poa20 =  new web3Foreign.eth.Contract(POA20_ABI, ERC20_ADDRESS);


async function main(){
  let foreignChaindId = await sendRawTx({
    url: FOREIGN_RPC_URL,
    params: [],
    method: 'net_version'
  })
  let nonce = await sendRawTx({
    url: FOREIGN_RPC_URL,
    method: "eth_getTransactionCount",
    params: [ USER_ADDRESS, "latest"]
  })
  nonce = Web3Utils.hexToNumber(nonce);
  let actualSent = 0;
  for(let i =0 ; i < Number(NUMBER_OF_DEPOSITS_TO_SEND); i++){
    const gasLimit = await poa20.methods.transfer(
      FOREIGN_BRIDGE_ADDRESS,
      Web3Utils.toWei(FOREIGN_MIN_AMOUNT_PER_TX)
    ).estimateGas({from: USER_ADDRESS});
    const data = await poa20.methods.transfer(
      FOREIGN_BRIDGE_ADDRESS,
      Web3Utils.toWei(FOREIGN_MIN_AMOUNT_PER_TX)).encodeABI({from: USER_ADDRESS});
    const txHash = await sendTx({
      rpcUrl: FOREIGN_RPC_URL,
      privateKey: USER_ADDRESS_PRIVATE_KEY,
      data,
      nonce,
      gasPrice: '1',
      amount: '0',
      gasLimit,
      to: ERC20_ADDRESS,
      web3: web3Foreign,
      chainId: foreignChaindId
    })
    if(txHash !== undefined) {
      nonce++;
      actualSent++;
      console.log(actualSent,' # ',txHash);
    } 
  }
}
main()