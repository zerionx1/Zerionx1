import type { BrokerAdapterDescriptor } from "@/types/broker";
export const brokerCatalog: BrokerAdapterDescriptor[] = [
 {key:"zerodha",name:"Zerodha Kite",kind:"india",authMode:"oauth",supportsSandbox:false,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
 {key:"upstox",name:"Upstox",kind:"india",authMode:"oauth",supportsSandbox:true,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
 {key:"angel-one",name:"Angel One SmartAPI",kind:"india",authMode:"api-key",supportsSandbox:false,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
 {key:"fyers",name:"Fyers",kind:"india",authMode:"oauth",supportsSandbox:true,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
 {key:"shoonya",name:"Shoonya",kind:"india",authMode:"api-key",supportsSandbox:false,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
 {key:"binance",name:"Binance",kind:"crypto",authMode:"api-key",supportsSandbox:true,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
 {key:"bybit",name:"Bybit",kind:"crypto",authMode:"api-key",supportsSandbox:true,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
 {key:"oanda",name:"OANDA",kind:"forex",authMode:"api-key",supportsSandbox:true,capabilities:{marketData:true,orders:true,positions:true,funds:true,websocket:true}},
];
