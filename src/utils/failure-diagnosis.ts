import type { TargetConfig } from "../types.js";

function buildCommand(target: TargetConfig): string {
  if (target.adapter === "http") {
    return target.url;
  }
  return [target.command, ...target.args].join(" ");
}

function trimLines(lines: string[], limit = 5): string[] {
  return lines.slice(-limit);
}

function classifyFailure(message: string): {
  diagnosis: string;
  likelyCauses: string[];
  nextSteps: string[];
} {
  const lower = message.toLowerCase();

  if (lower.includes("timed out")) {
    return {
      diagnosis:
        "The server did not complete MCP initialization before the configured timeout.",
      likelyCauses: [
        "The package may start a browser, app shell, or background service instead of staying attached to stdio.",
        "The target may need extra startup flags, credentials, or environment variables before it becomes usable.",
        "The timeout may simply be too low for this package on first boot."
      ],
      nextSteps: [
        "Run the command manually and confirm it stays attached to stdio instead of launching and idling elsewhere.",
        "Check the package docs for required flags, auth, or setup steps before MCP initialization.",
        "If the command is otherwise correct, raise `timeoutMs` and try again."
      ]
    };
  }

  if (lower.includes("connection closed") || lower.includes("closed")) {
    return {
      diagnosis:
        "The process exited or detached before MCP initialization completed.",
      likelyCauses: [
        "The package may expect extra startup arguments or environment variables.",
        "The package may not behave like a plain local-process stdio target under this invocation.",
        "The server may be crashing immediately and only leaving clues on stderr."
      ],
      nextSteps: [
        "Run the command manually and look for usage output, auth prompts, or crash text.",
        "Check whether the package expects a different transport or an app-oriented startup flow.",
        "Use the recent stderr lines below before assuming this is a harness bug."
      ]
    };
  }

  if (lower.includes("enoent") || lower.includes("spawn")) {
    return {
      diagnosis: "The command could not be started successfully.",
      likelyCauses: [
        "The executable may be missing from PATH.",
        "The target may need `npx` or a different command name.",
        "The cwd or local package layout may not match the intended invocation."
      ],
      nextSteps: [
        "Run the command manually and confirm the executable exists.",
        "Switch to `npx -y <package>` or an explicit binary path if needed.",
        "Double-check the target `cwd`, `command`, and `args` values."
      ]
    };
  }

  return {
    diagnosis: "The target did not behave like a healthy plain stdio MCP server during startup.",
    likelyCauses: [
      "The package may need additional startup configuration.",
      "The package may prefer a different transport or runtime shape.",
      "The process may be failing before MCP initialize is reachable."
    ],
    nextSteps: [
      "Run the command manually and inspect stdout/stderr behavior.",
      "Check package docs for startup requirements before assuming protocol failure.",
      "Treat this as ecosystem signal first; only change the harness if the package should work over stdio as invoked."
    ]
  };
}

export function formatConnectionFailureDiagnosis(
  target: TargetConfig,
  rawMessage: string,
  stderrLines: string[],
): string {
  const details = classifyFailure(rawMessage);
  const recentStderr = trimLines(stderrLines);

  const lines = [
    `Could not establish a plain stdio MCP session for target \`${target.targetId}\`.`,
    `Command: ${buildCommand(target)}`,
    `Diagnosis: ${details.diagnosis}`,
    `Raw error: ${rawMessage}`,
    `Likely causes:`,
    ...details.likelyCauses.map((cause) => `- ${cause}`),
    `Next steps:`,
    ...details.nextSteps.map((step) => `- ${step}`)
  ];

  if (recentStderr.length > 0) {
    lines.push("Recent stderr:");
    lines.push(...recentStderr.map((line) => `- ${line}`));
  }

  return lines.join("\n");
}
