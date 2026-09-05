(() => {
  const status = document.querySelector("#command-copy-status");
  let clearStatusTimer;

  const setStatus = message => {
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(clearStatusTimer);
    clearStatusTimer = window.setTimeout(() => {
      status.textContent = "";
    }, 4000);
  };

  const fallbackCopy = value => {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.className = "clipboard-fallback";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("copy command was rejected");
  };

  const copy = async value => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Some browsers expose Clipboard API but reject it outside a trusted gesture.
      }
    }
    fallbackCopy(value);
  };

  document.querySelectorAll("[data-copy-command]").forEach(button => {
    const originalLabel = button.textContent;
    let restoreLabelTimer;

    button.addEventListener("click", async () => {
      const command = button.getAttribute("data-copy-command");
      if (!command) return;
      try {
        await copy(command);
        button.textContent = "Copied";
        setStatus("Command copied to your clipboard.");
        window.clearTimeout(restoreLabelTimer);
        restoreLabelTimer = window.setTimeout(() => {
          button.textContent = originalLabel;
        }, 1800);
      } catch {
        setStatus("Copy was blocked. Select the command text and copy it manually.");
      }
    });
  });
})();
