DIR=/home/resilio/resibot

# Clear current build
rm -r build

# Get build archive
curl -L https://github.com/resilio-tech/resibot/releases/latest/download/build.tar.gz --output $DIR/build.tar.gz

# Go to Directory
cd $DIR

# Extract build archive
tar -xzf build.tar.gz --directory $DIR

# Remove archive
rm build.tar.gz

# Install packages
npm i

# Restart PM2 for resibot application
pm2 startOrRestart pm2.config.js