#!/bin/bash
# Setup script to create the GitHub repo and push

echo "🔥 Setting up Flare on GitHub..."

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "Installing GitHub CLI..."
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update && sudo apt install gh -y
fi

# Check auth status
if ! gh auth status &> /dev/null; then
    echo "Please authenticate with GitHub:"
    gh auth login
fi

# Create the repo
echo "Creating repository..."
gh repo create flare --public --description "🔥 Open source Flash/Animate alternative - the animation tool the industry deserves" --source . --remote origin --push

echo "✅ Done! Repository created at https://github.com/IsaacBinding/flare"
