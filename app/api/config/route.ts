import { NextResponse } from "next/server";
import type { AIProvider, DeploymentMode } from "@/lib/ai-clients/router";

export type { DeploymentMode, AIProvider };

export interface AppConfig {
  deploymentMode: DeploymentMode;
  geminiApiKeyConfigured: boolean;
  anthropicApiKeyConfigured: boolean;
  openaiApiKeyConfigured: boolean;
  availableProviders: AIProvider[];
}

export async function GET() {
  const deploymentMode: DeploymentMode =
    (process.env.DEPLOYMENT_MODE as DeploymentMode) || "multi-user";

  // In single-user mode, check if API keys are pre-configured via env vars
  const geminiApiKeyConfigured =
    deploymentMode === "single-user" && !!process.env.GEMINI_API_KEY;
  const anthropicApiKeyConfigured =
    deploymentMode === "single-user" && !!process.env.ANTHROPIC_API_KEY;
  const openaiApiKeyConfigured =
    deploymentMode === "single-user" && !!process.env.OPENAI_API_KEY;

  // Determine available providers based on configured keys
  const availableProviders: AIProvider[] = [];
  if (geminiApiKeyConfigured || deploymentMode === "multi-user") {
    availableProviders.push("gemini");
  }
  if (anthropicApiKeyConfigured || deploymentMode === "multi-user") {
    availableProviders.push("claude");
  }
  if (openaiApiKeyConfigured || deploymentMode === "multi-user") {
    availableProviders.push("openai");
  }

  const config: AppConfig = {
    deploymentMode,
    geminiApiKeyConfigured,
    anthropicApiKeyConfigured,
    openaiApiKeyConfigured,
    availableProviders,
  };

  return NextResponse.json(config);
}
