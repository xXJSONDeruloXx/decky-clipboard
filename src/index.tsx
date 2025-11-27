import {
  ButtonItem,
  PanelSection,
  PanelSectionRow,
  staticClasses,
  ToggleField,
  TextField,
  DialogButton,
  Focusable,
  showContextMenu,
  Menu,
  MenuItem,
  ConfirmModal,
  showModal
} from "@decky/ui";
import {
  callable,
  definePlugin,
  toaster
} from "@decky/api";
import { useState, useEffect } from "react";
import { FaClipboard, FaCheck, FaPlus, FaEllipsisH } from "react-icons/fa";

// Backend API calls
const getEntries = callable<[], ClipboardEntry[]>("get_entries");
const addEntry = callable<[name: string, command: string], ClipboardEntry>("add_entry");
const updateEntry = callable<[entryId: string, name: string, command: string], ClipboardEntry | null>("update_entry");
const deleteEntry = callable<[entryId: string], boolean>("delete_entry");

interface ClipboardEntry {
  id: string;
  name: string;
  command: string;
}

interface ClipboardButtonProps {
  entry: ClipboardEntry;
  appendCommand: boolean;
  onEdit: (entry: ClipboardEntry) => void;
  onDelete: (entry: ClipboardEntry) => void;
}

function ClipboardButton({ entry, appendCommand, onEdit, onDelete }: ClipboardButtonProps) {
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
      const text = appendCommand ? `${entry.command} %command%` : entry.command;

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

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(
      <Menu label="Entry Options">
        <MenuItem onSelected={() => onEdit(entry)}>Edit</MenuItem>
        <MenuItem tone="destructive" onSelected={() => onDelete(entry)}>Delete</MenuItem>
      </Menu>,
      e.target as HTMLElement
    );
  };

  return (
    <PanelSectionRow>
      <Focusable
        style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}
        onSecondaryActionDescription="Options"
        onSecondaryButton={(evt) => handleContextMenu(evt as unknown as MouseEvent)}
      >
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
              {showSuccess ? "Copied to clipboard" : isLoading ? "Copying..." : entry.name}
            </div>
          </div>
        </ButtonItem>
        <DialogButton
          style={{ minWidth: "40px", padding: "10px" }}
          onClick={(e) => handleContextMenu(e as unknown as MouseEvent)}
        >
          <FaEllipsisH />
        </DialogButton>
      </Focusable>
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

// Modal component for adding/editing entries
interface EntryModalProps {
  closeModal?: () => void;
  entry?: ClipboardEntry | null;
  onSave: (name: string, command: string) => void;
}

function EntryModal({ closeModal, entry, onSave }: EntryModalProps) {
  const [name, setName] = useState(entry?.name || "");
  const [command, setCommand] = useState(entry?.command || "");

  const handleSave = () => {
    if (name.trim() && command.trim()) {
      onSave(name.trim(), command.trim());
      closeModal?.();
    } else {
      toaster.toast({
        title: "Validation Error",
        body: "Both name and command are required"
      });
    }
  };

  return (
    <ConfirmModal
      strTitle={entry ? "Edit Entry" : "Add Entry"}
      onOK={handleSave}
      onCancel={closeModal}
      strOKButtonText="Save"
      strCancelButtonText="Cancel"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <TextField
          label="Name"
          description="Display name for the clipboard entry"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Command"
          description="The command/text to copy (without %command%)"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
      </div>
    </ConfirmModal>
  );
}

function Content() {
  const [appendCommand, setAppendCommand] = useState(true);
  const [entries, setEntries] = useState<ClipboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load entries on mount
  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const loadedEntries = await getEntries();
      setEntries(loadedEntries);
    } catch (error) {
      console.error("Failed to load entries:", error);
      toaster.toast({
        title: "Error",
        body: "Failed to load clipboard entries"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = () => {
    showModal(
      <EntryModal
        onSave={async (name, command) => {
          try {
            await addEntry(name, command);
            await loadEntries();
            toaster.toast({
              title: "Success",
              body: "Entry added"
            });
          } catch (error) {
            toaster.toast({
              title: "Error",
              body: "Failed to add entry"
            });
          }
        }}
      />
    );
  };

  const handleEditEntry = (entry: ClipboardEntry) => {
    showModal(
      <EntryModal
        entry={entry}
        onSave={async (name, command) => {
          try {
            await updateEntry(entry.id, name, command);
            await loadEntries();
            toaster.toast({
              title: "Success",
              body: "Entry updated"
            });
          } catch (error) {
            toaster.toast({
              title: "Error",
              body: "Failed to update entry"
            });
          }
        }}
      />
    );
  };

  const handleDeleteEntry = (entry: ClipboardEntry) => {
    showModal(
      <ConfirmModal
        strTitle="Delete Entry"
        strDescription={`Are you sure you want to delete "${entry.name}"?`}
        strOKButtonText="Delete"
        strCancelButtonText="Cancel"
        bDestructiveWarning={true}
        onOK={async () => {
          try {
            await deleteEntry(entry.id);
            await loadEntries();
            toaster.toast({
              title: "Success",
              body: "Entry deleted"
            });
          } catch (error) {
            toaster.toast({
              title: "Error",
              body: "Failed to delete entry"
            });
          }
        }}
      />
    );
  };

  return (
    <PanelSection title="Clipboard Commands">
      <PanelSectionRow>
        <ToggleField
          label="Append %command%"
          description="When enabled, appends %command% to the clipboard entry"
          checked={appendCommand}
          onChange={(checked) => setAppendCommand(checked)}
        />
      </PanelSectionRow>

      {isLoading ? (
        <PanelSectionRow>
          <div style={{ textAlign: "center", padding: "16px" }}>Loading...</div>
        </PanelSectionRow>
      ) : (
        <>
          {entries.map((entry) => (
            <ClipboardButton
              key={entry.id}
              entry={entry}
              appendCommand={appendCommand}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
            />
          ))}
        </>
      )}

      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={handleAddEntry}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
            <FaPlus />
            <span>Add Entry</span>
          </div>
        </ButtonItem>
      </PanelSectionRow>
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
