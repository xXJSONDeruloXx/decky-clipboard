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
import { FaClipboard, FaCheck, FaPlus, FaPencilAlt } from "react-icons/fa";

// Backend API calls
const getEntries = callable<[], ClipboardEntry[]>("get_entries");
const addEntry = callable<[name: string, command: string], ClipboardEntry>("add_entry");
const updateEntry = callable<[entryId: string, name: string, command: string], ClipboardEntry | null>("update_entry");
const deleteEntry = callable<[entryId: string], boolean>("delete_entry");

// Helper to truncate long names
const truncateName = (name: string, maxLength: number = 18): string => {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 1) + "…";
};

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
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "0",
          marginTop: "8px"
        }}
        flow-children="horizontal"
        onSecondaryActionDescription="Options"
        onSecondaryButton={(evt) => handleContextMenu(evt as unknown as MouseEvent)}
      >
        <DialogButton
          style={{
            height: "40px",
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
            minWidth: "0",
          }}
          onClick={copyToClipboard}
          disabled={isLoading || showSuccess}
        >
          {showSuccess ? (
            <span style={{ color: "#4CAF50", fontWeight: "bold" }}>
              <FaCheck style={{ marginRight: "8px" }} />
              Copied!
            </span>
          ) : (
            <span>{isLoading ? "Copying..." : truncateName(entry.name)}</span>
          )}
        </DialogButton>
        <DialogButton
          style={{
            height: "40px",
            width: "40px",
            minWidth: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px",
          }}
          onClick={(e) => handleContextMenu(e as unknown as MouseEvent)}
        >
          <FaPencilAlt size={16} />
        </DialogButton>
      </Focusable>
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
  const [command, setCommand] = useState(entry?.command || "");
  const [name, setName] = useState(entry?.name || "");

  const handleSave = () => {
    if (command.trim()) {
      // If name is empty, use command as the name
      const finalName = name.trim() || command.trim();
      onSave(finalName, command.trim());
      closeModal?.();
    } else {
      toaster.toast({
        title: "Validation Error",
        body: "Command is required"
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
          label="Command"
          description="The command/text to copy (without %command%)"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
        <TextField
          label="Name (optional)"
          description="Display name - defaults to command if left blank"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
