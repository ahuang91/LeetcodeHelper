import { NextResponse } from "next/server";

export type DeploymentMode = "single-user" | "multi-user";

export interface AppConfig {
  deploymentMode: DeploymentMode;
  geminiApiKeyConfigured: boolean;
}

export async function GET() {
  const deploymentMode: DeploymentMode =
    (process.env.DEPLOYMENT_MODE as DeploymentMode) || "multi-user";

  // In single-user mode, check if API keys are pre-configured via env vars
  const geminiApiKeyConfigured =
    deploymentMode === "single-user" && !!process.env.GEMINI_API_KEY;

  const config: AppConfig = {
    deploymentMode,
    geminiApiKeyConfigured,
  };

  return NextResponse.json(config);
}
