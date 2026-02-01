import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { encrypt, decrypt } from "@/lib/crypto";
import { StoredCredentials } from "@/lib/leetcode";

const CREDENTIALS_FILE = path.join(process.cwd(), "data", "credentials.json");

function ensureDataDir() {
  const dataDir = path.dirname(CREDENTIALS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return NextResponse.json({ exists: false });
    }

    const fileContent = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
    const { encrypted } = JSON.parse(fileContent);
    const decrypted = decrypt(encrypted);
    const credentials: StoredCredentials = JSON.parse(decrypted);

    return NextResponse.json({
      exists: true,
      username: credentials.username,
    });
  } catch {
    return NextResponse.json({ exists: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, sessionCookie } = body;

    if (!username || !sessionCookie) {
      return NextResponse.json(
        { error: "Username and session cookie are required" },
        { status: 400 }
      );
    }

    const credentials: StoredCredentials = { username, sessionCookie };
    const encrypted = encrypt(JSON.stringify(credentials));

    ensureDataDir();
    fs.writeFileSync(
      CREDENTIALS_FILE,
      JSON.stringify({ encrypted }, null, 2)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving credentials:", error);
    return NextResponse.json(
      { error: "Failed to save credentials" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credentials:", error);
    return NextResponse.json(
      { error: "Failed to delete credentials" },
      { status: 500 }
    );
  }
}
