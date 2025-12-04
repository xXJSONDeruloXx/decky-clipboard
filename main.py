# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code repo
# and add the `decky-loader/plugin/imports` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky
import os
import json

SETTINGS_FILE = "clipboard_entries.json"

class Plugin:
    entries = []
    
    def _get_settings_path(self):
        return os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, SETTINGS_FILE)
    
    def _load_entries(self):
        path = self._get_settings_path()
        if os.path.exists(path):
            try:
                with open(path, 'r') as f:
                    self.entries = json.load(f)
            except Exception as e:
                decky.logger.error(f"Failed to load entries: {e}")
                self.entries = []
        else:
            # Default entries
            self.entries = [
                {"id": "1", "name": "SteamDeck=0", "command": "SteamDeck=0"},
                {"id": "2", "name": "FSR4", "command": "PROTON_FSR4_UPGRADE=1"},
                {"id": "3", "name": "RDNA3-FSR4", "command": "PROTON_FSR4_RDNA3_UPGRADE=1"}
            ]
            self._save_entries()
    
    def _save_entries(self):
        path = self._get_settings_path()
        try:
            with open(path, 'w') as f:
                json.dump(self.entries, f, indent=2)
        except Exception as e:
            decky.logger.error(f"Failed to save entries: {e}")
    
    async def get_entries(self):
        return self.entries
    
    async def add_entry(self, name: str, command: str):
        # Generate a unique ID
        max_id = 0
        for entry in self.entries:
            try:
                entry_id = int(entry.get("id", 0))
                if entry_id > max_id:
                    max_id = entry_id
            except ValueError:
                pass
        
        new_entry = {
            "id": str(max_id + 1),
            "name": name,
            "command": command
        }
        self.entries.append(new_entry)
        self._save_entries()
        return new_entry
    
    async def update_entry(self, entry_id: str, name: str, command: str):
        for entry in self.entries:
            if entry.get("id") == entry_id:
                entry["name"] = name
                entry["command"] = command
                self._save_entries()
                return entry
        return None
    
    async def delete_entry(self, entry_id: str):
        self.entries = [e for e in self.entries if e.get("id") != entry_id]
        self._save_entries()
        return True

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        decky.logger.info("Decky Clipboard plugin loaded")
        self._load_entries()

    # Function called first during the unload process
    async def _unload(self):
        decky.logger.info("Decky Clipboard plugin unloaded")

    # Function called after `_unload` during uninstall
    async def _uninstall(self):
        decky.logger.info("Decky Clipboard plugin uninstalled")
