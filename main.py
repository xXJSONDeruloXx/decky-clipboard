# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code repo
# and add the `decky-loader/plugin/imports` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky

class Plugin:
    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        decky.logger.info("Decky Clipboard plugin loaded")

    # Function called first during the unload process
    async def _unload(self):
        decky.logger.info("Decky Clipboard plugin unloaded")

    # Function called after `_unload` during uninstall
    async def _uninstall(self):
        decky.logger.info("Decky Clipboard plugin uninstalled")
