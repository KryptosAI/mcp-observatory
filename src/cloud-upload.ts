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
    throw new Error(`Cloud upload failed (${response.status}): ${text}`);
  }

  writeLine(text);
  writeLine(`Uploaded ${context.artifactPath}`);
  writeLine(`Hosted dashboard: ${context.dashboardUrl}/dashboard`);
  writeLine(`Need 90-day history and CI ingestion? Review Individual Pro: ${context.pricingUrl}?plan=individual`);
  writeLine(`Next: ${context.binName} setup-ci --all --command "npx -y my-mcp-server"`);
}
