export type DerivativeInstrument = {
  id: string;
  label: string;
  underlying: string;
  segment: "index-future" | "index-option" | "stock-future" | "stock-option";
  exchange: "NFO";
  tvSymbol: string;
  searchHint: string;
};

export const derivativeUniverse: DerivativeInstrument[] = [
  { id:"nifty-fut", label:"NIFTY Futures", underlying:"NIFTY", segment:"index-future", exchange:"NFO", tvSymbol:"NSE:NIFTY", searchHint:"NIFTY FUT" },
  { id:"banknifty-fut", label:"BANK NIFTY Futures", underlying:"BANKNIFTY", segment:"index-future", exchange:"NFO", tvSymbol:"NSE:BANKNIFTY", searchHint:"BANKNIFTY FUT" },
  { id:"finnifty-fut", label:"FIN NIFTY Futures", underlying:"FINNIFTY", segment:"index-future", exchange:"NFO", tvSymbol:"NSE:CNXFINANCE", searchHint:"FINNIFTY FUT" },
  { id:"midcpnifty-fut", label:"MIDCP NIFTY Futures", underlying:"MIDCPNIFTY", segment:"index-future", exchange:"NFO", tvSymbol:"NSE:MIDCPNIFTY", searchHint:"MIDCPNIFTY FUT" },
  { id:"nifty-opt", label:"NIFTY Options", underlying:"NIFTY", segment:"index-option", exchange:"NFO", tvSymbol:"NSE:NIFTY", searchHint:"NIFTY CE PE" },
  { id:"banknifty-opt", label:"BANK NIFTY Options", underlying:"BANKNIFTY", segment:"index-option", exchange:"NFO", tvSymbol:"NSE:BANKNIFTY", searchHint:"BANKNIFTY CE PE" },
  { id:"finnifty-opt", label:"FIN NIFTY Options", underlying:"FINNIFTY", segment:"index-option", exchange:"NFO", tvSymbol:"NSE:CNXFINANCE", searchHint:"FINNIFTY CE PE" },
  { id:"stock-fut", label:"Stock Futures", underlying:"STOCK", segment:"stock-future", exchange:"NFO", tvSymbol:"NSE:RELIANCE", searchHint:"RELIANCE TCS HDFCBANK FUT" },
  { id:"stock-opt", label:"Stock Options", underlying:"STOCK", segment:"stock-option", exchange:"NFO", tvSymbol:"NSE:RELIANCE", searchHint:"RELIANCE TCS HDFCBANK CE PE" },
];
