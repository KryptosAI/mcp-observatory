export interface CloudUploadResponseContext {
  artifactPath: string;
  dashboardUrl: string;
  pricingUrl: string;
  binName: string;
}

type UploadResponse = Pick<Response, "ok" | "status" | "text">;

export async function emitCloudUploadResponse(
  response: UploadResponse,
  context: CloudUploadResponseContext,
  writeLine: (line: string) => void = line => process.stdout.write(`${line}\n`),
): Promise<void> {
  const text = await response.text();
  if (!response.ok) {
    let detail = "The hosted service could not save this receipt.";
    let code = "";
    try {
      const body = JSON.parse(text) as { message?: string; code?: string };
      if (typeof body.message === "string") detail = body.message;
      if (typeof body.code === "string") code = body.code;
    } catch { /* Non-JSON gateway errors still get an actionable recovery path. */ }
    const recovery = response.status === 401
      ? `Sign in again: ${context.binName} cloud login. Then retry the same upload.`
      : ["quota_exceeded", "target_limit_exceeded", "plan_required", "upgrade_required", "subscription_required"].includes(code) || response.status === 402
        ? `Your local receipt is safe. Review your usage and plan: ${context.dashboardUrl}/dashboard. Plans: ${context.pricingUrl}?plan=individual`
        : "Your local receipt is safe. Retry the same upload after resolving the error.";
    throw new Error(`Cloud upload failed (${response.status}): ${detail}\n${recovery}`);
  }

  writeLine("Upload complete. Your hosted snapshot is ready.");
  writeLine(`Local receipt: ${context.artifactPath}`);
  writeLine(`Hosted dashboard: ${context.dashboardUrl}/dashboard`);
  writeLine("Next: open the dashboard to review this result. Use the same GitHub account you just connected.");
  writeLine(`Need 90-day history and CI ingestion? Review Individual Pro: ${context.pricingUrl}?plan=individual`);
  writeLine("Local CI remains free. Setup guide: https://mcp-observatory.com/start/");
}
