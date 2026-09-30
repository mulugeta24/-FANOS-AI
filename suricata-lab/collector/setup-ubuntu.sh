#!/bin/bash
# FANOS Suricata Collector - Ubuntu Setup Script
# This script automates the installation and configuration of the FANOS Suricata Collector on Ubuntu

set -e  # Exit on any error

echo "========================================"
echo "FANOS Suricata Collector Setup"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "ERROR: Please run as root (use sudo)"
    exit 1
fi

# Configuration
INSTALL_DIR="/opt/fanos-collector"
CONFIG_DIR="/etc/fanos"
STATE_DIR="/var/lib/fanos"
SERVICE_NAME="fanos-suricata-collector"

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Step 1: Checking prerequisites..."
echo "---"

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Install with: sudo apt install python3 python3-pip python3-venv"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | awk '{print $2}')
echo "✓ Python version: $PYTHON_VERSION"

# Check Suricata
if ! command -v suricata &> /dev/null; then
    echo "WARNING: Suricata is not installed or not in PATH"
    echo "Install with: sudo apt install suricata"
else
    SURICATA_VERSION=$(suricata --version 2>&1 | grep -oP 'Suricata version \K[0-9.]+' || echo "unknown")
    echo "✓ Suricata version: $SURICATA_VERSION"
fi

# Check if EVE log exists
if [ ! -f "/var/log/suricata/eve.json" ]; then
    echo "WARNING: /var/log/suricata/eve.json not found"
    echo "Ensure Suricata is configured and running"
else
    EVE_SIZE=$(du -h /var/log/suricata/eve.json | awk '{print $1}')
    echo "✓ EVE log exists: $EVE_SIZE"
fi

# Check network connectivity to Windows backend
echo ""
echo "Step 2: Checking network connectivity..."
echo "---"
if curl -s --connect-timeout 5 http://192.168.56.1:8000/health > /dev/null; then
    echo "✓ Windows backend is reachable at http://192.168.56.1:8000"
else
    echo "WARNING: Cannot reach Windows backend at http://192.168.56.1:8000"
    echo "Ensure FANOS backend is running on Windows host"
    echo "Continuing with installation..."
fi

echo ""
echo "Step 3: Installing Python dependencies..."
echo "---"

# Install system dependencies
apt update
apt install -y python3-pip python3-venv

echo ""
echo "Step 4: Creating installation directory..."
echo "---"

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Copy collector files
echo "Copying collector files from $SCRIPT_DIR to $INSTALL_DIR..."
cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/"
echo "✓ Files copied"

# Create virtual environment
echo "Creating Python virtual environment..."
cd "$INSTALL_DIR"
python3 -m venv venv
echo "✓ Virtual environment created"

# Install dependencies
echo "Installing Python packages..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
echo "✓ Dependencies installed"

echo ""
echo "Step 5: Configuring environment..."
echo "---"

# Create configuration directory
mkdir -p "$CONFIG_DIR"

# Copy environment configuration
if [ -f "$INSTALL_DIR/.env.ubuntu" ]; then
    cp "$INSTALL_DIR/.env.ubuntu" "$CONFIG_DIR/collector.env"
    echo "✓ Configuration file created at $CONFIG_DIR/collector.env"
    echo ""
    echo "IMPORTANT: Review and update the configuration file:"
    echo "  sudo nano $CONFIG_DIR/collector.env"
    echo ""
    echo "Ensure FANOS_SURICATA_TOKEN matches the Windows backend token."
else
    echo "WARNING: .env.ubuntu template not found, creating default..."
    cat > "$CONFIG_DIR/collector.env" <<EOF
SURICATA_EVE_PATH=/var/log/suricata/eve.json
FANOS_SURICATA_URL=http://192.168.56.1:8000/api/v1/suricata/events
FANOS_SURICATA_TOKEN=CHANGE_THIS_TOKEN
SURICATA_SENSOR_ID=ubuntu-suricata-01
SURICATA_COLLECTOR_STATE=/var/lib/fanos/collector-state.json
SURICATA_POLL_SECONDS=1
SURICATA_RETRY_SECONDS=5
EOF
    echo "✓ Default configuration created"
fi

# Set secure permissions on config file
chmod 600 "$CONFIG_DIR/collector.env"
echo "✓ Configuration file permissions set (600)"

# Create state directory
mkdir -p "$STATE_DIR"
echo "✓ State directory created at $STATE_DIR"

echo ""
echo "Step 6: Installing systemd service..."
echo "---"

# Copy service file
if [ -f "$INSTALL_DIR/fanos-suricata-collector.service" ]; then
    cp "$INSTALL_DIR/fanos-suricata-collector.service" "/etc/systemd/system/$SERVICE_NAME.service"
    echo "✓ Service file installed"
else
    echo "WARNING: Service file not found, creating default..."
    cat > "/etc/systemd/system/$SERVICE_NAME.service" <<EOF
[Unit]
Description=FANOS Suricata Collector
After=network.target suricata.service
Requires=suricata.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$CONFIG_DIR/collector.env
ExecStart=$INSTALL_DIR/venv/bin/python3 -m app.main
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    echo "✓ Default service file created"
fi

# Reload systemd
systemctl daemon-reload
echo "✓ Systemd reloaded"

# Enable service
systemctl enable "$SERVICE_NAME"
echo "✓ Service enabled to start on boot"

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Review and update the configuration:"
echo "   sudo nano $CONFIG_DIR/collector.env"
echo ""
echo "2. Ensure the token matches your Windows backend:"
echo "   FANOS_SURICATA_TOKEN must match SURICATA_INGEST_TOKEN in Windows backend/.env"
echo ""
echo "3. Start the collector service:"
echo "   sudo systemctl start $SERVICE_NAME"
echo ""
echo "4. Check service status:"
echo "   sudo systemctl status $SERVICE_NAME"
echo ""
echo "5. Monitor logs:"
echo "   sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "6. Test end-to-end:"
echo "   - Generate Suricata alerts (network traffic)"
echo "   - Check logs: sudo journalctl -u $SERVICE_NAME -n 50"
echo "   - Verify in Windows SOC Dashboard"
echo ""
echo "For detailed documentation, see:"
echo "  $INSTALL_DIR/UBUNTU_DEPLOYMENT.md"
echo ""
echo "Installation directory: $INSTALL_DIR"
echo "Configuration file: $CONFIG_DIR/collector.env"
echo "State directory: $STATE_DIR"
echo "Service name: $SERVICE_NAME"
echo ""
