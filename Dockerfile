# Gunakan versi Node.js yang stabil
FROM node:18-alpine

# Tentukan folder kerja di dalam container
WORKDIR /app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Instal dependensi (hanya produksi)
RUN npm install --production

# Salin seluruh kode backend ke dalam container
COPY . .

# Beri tahu port yang digunakan (Back4App akan memberikan port otomatis)
EXPOSE 8080

# Jalankan aplikasi menggunakan script start yang ada di package.json
CMD ["npm", "start"]
