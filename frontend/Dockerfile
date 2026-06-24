# Use a Node.js image to build the frontend
FROM node:18 AS build

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Build the frontend
RUN npm run build

# Use an Nginx image to serve the built frontend
FROM nginx:alpine

# Copy the built frontend files to the Nginx container
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 5173 (or the one used by your frontend)
EXPOSE 5173

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
