import { NextResponse } from "next/server";
import { createReleaseVersion } from "@/lib/release/version";
export function GET() { return NextResponse.json(createReleaseVersion(process.env.npm_package_version ?? "0.1.0", process.env.VERCEL_GIT_COMMIT_SHA)); }
