import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses
} from "@decky/ui";
import {
  definePlugin,
  toaster
} from "@decky/api";
import { useState, useEffect } from "react";
import { FaClipboard, FaCheck } from "react-icons/fa";

interface ClipboardButtonProps {
  command: string;
  buttonText: string;
}

function ClipboardButton({ command, buttonText }: ClipboardButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset success state after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showSuccess]);

  const copyToClipboard = async () => {
    if (isLoading || showSuccess) return;

    setIsLoading(true);
    try {
      const text = command;

      // Use the proven input simulation method for gaming mode
      const tempInput = document.createElement('input');
      tempInput.value = text;
      tempInput.style.position = 'absolute';
      tempInput.style.left = '-9999px';
      document.body.appendChild(tempInput);

      // Focus and select the text
      tempInput.focus();
      tempInput.select();

      // Try copying using execCommand first (most reliable in gaming mode)
      let copySuccess = false;
      try {
        if (document.execCommand('copy')) {
          copySuccess = true;
        }
      } catch (e) {
        // If execCommand fails, try navigator.clipboard as fallback
        try {
          await navigator.clipboard.writeText(text);
          copySuccess = true;
        } catch (clipboardError) {
          console.error('Both copy methods failed:', e, clipboardError);
        }
      }

      // Clean up
      document.body.removeChild(tempInput);

      if (copySuccess) {
        setShowSuccess(true);
      } else {
        toaster.toast({
          title: "Copy Failed",
          body: "Unable to copy to clipboard"
        });
      }
    } catch (error) {
      toaster.toast({
        title: "Copy Failed",
        body: `Error: ${String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PanelSectionRow>
      <ButtonItem
        layout="below"
        onClick={copyToClipboard}
        disabled={isLoading || showSuccess}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {showSuccess ? (
            <FaCheck style={{ color: "#4CAF50" }} />
          ) : isLoading ? (
            <FaClipboard style={{ animation: "pulse 1s ease-in-out infinite", opacity: 0.7 }} />
          ) : (
            <FaClipboard />
          )}
          <div style={{
            color: showSuccess ? "#4CAF50" : "inherit",
            fontWeight: showSuccess ? "bold" : "normal"
          }}>
            {showSuccess ? "Copied to clipboard" : isLoading ? "Copying..." : buttonText}
          </div>
        </div>
      </ButtonItem>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.7; }
          50% { opacity: 1; }
          100% { opacity: 0.7; }
        }
      `}</style>
    </PanelSectionRow>
  );
}

function Content() {
  return (
    <PanelSection title="Clipboard Commands">
      <ClipboardButton
        command="SteamDeck=0 %command%"
        buttonText="SteamDeck=0"
      />
    </PanelSection>
  );
}

export default definePlugin(() => {
  console.log("Decky Clipboard plugin initializing");

  return {
    name: "Decky Clipboard",
    titleView: <div className={staticClasses.Title}>Decky Clipboard</div>,
    content: <Content />,
    icon: <FaClipboard />,
    onDismount() {
      console.log("Decky Clipboard plugin unloading");
    },
  };
});
