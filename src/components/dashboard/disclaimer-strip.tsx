import { signalDisclaimer } from "@/config/signals";
export function DisclaimerStrip(){return <div className="disclaimer-strip"><strong>Decision support only.</strong><span>{signalDisclaimer} Live execution is disabled in Phase 2.</span></div>}
