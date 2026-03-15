#!/bin/bash
set -e

echo "Pulling latest code..."
git pull origin main

echo "Installing backend dependencies..."
cd backend
npm install --omit=dev
cd ..

echo "Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

echo "Copying frontend build..."
sudo cp -r frontend/dist /var/www/blinkit/

echo "Ensuring upload directories exist..."
sudo mkdir -p /var/www/uploads/products
sudo chown -R www-data:www-data /var/www/uploads

echo "Restarting backend..."
cd backend
pm2 restart ecosystem.config.js --env production
cd ..

echo "Reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "Done."
