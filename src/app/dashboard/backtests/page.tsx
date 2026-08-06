import { BacktestLab } from "@/components/backtests/backtest-lab";
import { listUserBacktests } from "@/lib/backtest/backtest-repository";
import { listUserStrategies } from "@/lib/strategy/strategy-repository";
export default async function Page(){const [strategies,history]=await Promise.all([listUserStrategies(),listUserBacktests()]);return <main className="dashboard-page"><div className="mb-8"><p className="eyebrow">Research before deployment</p><h1 className="mt-2 text-4xl font-semibold md:text-5xl">Backtesting Lab</h1><p className="mt-3 max-w-2xl text-white/55">Run persisted historical simulations with explicit fees, slippage, real candle requirements and methodology warnings.</p></div><BacktestLab strategies={strategies} history={history}/></main>}
