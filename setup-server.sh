#!/bin/bash
set -e

echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "Installing Nginx, PostgreSQL, Curl, and Git..."
sudo apt install -y nginx postgresql postgresql-contrib curl git

echo "Installing Node.js via NVM..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

echo "Installing PM2 globally..."
npm install -g pm2

echo "Creating web directory structure..."
sudo mkdir -p /var/www/blinkit/dist
sudo mkdir -p /var/www/uploads/products

echo "Setting permissions..."
sudo chown -R $USER:$USER /var/www/blinkit
sudo chown -R www-data:www-data /var/www/uploads

echo "Setup complete. Next steps:"
echo "1. Create PostgreSQL user 'USER' and database 'blinkitdb'"
echo "2. Run: psql -U postgres -d blinkitdb -f setup-db.sql"
echo "3. Copy .env.example to backend/.env and populate real values (especially JWT secret, Geoapify API key)"
echo "4. Copy frontend/.env.production values if applying locally before build, or set them up on the server before building."
echo "5. Run deploy.sh"
