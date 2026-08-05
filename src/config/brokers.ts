import type { BrokerAdapterDescriptor } from "@/types/broker";
export const brokerCatalog: BrokerAdapterDescriptor[] = [
 {key:"indian-broker",name:"Indian Broker Adapter",kind:"india",authMode:"oauth",supportsSandbox:true,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
 {key:"crypto-exchange",name:"Crypto Exchange Adapter",kind:"crypto",authMode:"api-key",supportsSandbox:true,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
 {key:"forex-broker",name:"Forex Broker Adapter",kind:"forex",authMode:"oauth",supportsSandbox:true,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
];
