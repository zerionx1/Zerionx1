import type { ReactNode } from "react";
import { PaperSectionNav } from "@/components/paper/paper-section-nav";
export default function PaperLayout({children}:{children:ReactNode}){return <><PaperSectionNav/>{children}</>}
