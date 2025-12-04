# Decky Clipboard justfile

# Default to listing available commands
default:
    @just --list

# Build the plugin
build:
    .vscode/build.sh

# Deploy to console (scp to bazzite)
deploy:
    scp "out/Decky Clipboard.zip" bazzite@192.168.1.100:~/Downloads/

# Build and deploy
all: build deploy
