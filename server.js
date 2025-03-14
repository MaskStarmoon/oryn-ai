const express = require('express');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join('Memo-Oryn', 'MemoryOryn.json');

app.use(express.json());
app.use(express.static('public'));

// Fungsi membaca database JSON
const readDatabase = () => {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
};

// Fungsi menyimpan database JSON
const saveDatabase = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

// API Login atau Registrasi
app.post('/login', (req, res) => {
    const { name, password } = req.body;
    let database = readDatabase();

    // Cek apakah user sudah ada di database
    let user = Object.values(database).find(user => user.name === name && user.password === password);

    if (!user) {
        // Jika belum ada, buat ID baru
        const newId = Object.keys(database).length + 1;
        user = {
            name,
            password,
            id: newId,
            previousText: "",
            prompt: ""  // Prompt default kosong
        };
        database[newId] = user;
        saveDatabase(database);
    }

    res.json(user);
});

// API Chat AI
app.post('/chat', async (req, res) => {
    const { id, userInput, userPrompt } = req.body; // Tambahkan userPrompt dari input user
    let database = readDatabase();

    // Cek apakah user ada di database
    if (!database[id]) {
        return res.status(400).json({ error: "User tidak ditemukan" });
    }

    // Ambil previousText & prompt dari database
    const previousText = database[id].previousText || "";
    const promptCustom = userPrompt || database[id].prompt || ""; // Gunakan prompt user atau default
    const promptAI = `Kamu adalah Oryn, AI yang dibuat oleh Range.\nPrompt: ${promptCustom}\nUser Input: ${userInput}\nUser Previous Input: ${previousText}`;

    try {
        // Request ke API AI
        const response = await axios.get(`https://api-rangestudio.vercel.app/api/gemini?text=${encodeURIComponent(promptAI)}`);
        const aiAnswer = response.data.answer;

        // Simpan history chat
        database[id].previousText = userInput;
        database[id].prompt = promptCustom; // Simpan prompt terbaru yang diatur oleh user
        saveDatabase(database);

        res.json({ answer: aiAnswer });
    } catch (error) {
        console.error("Error fetching AI response:", error);
        res.status(500).json({ error: "Terjadi kesalahan dalam mengambil respons AI" });
    }
});

// Jalankan server
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));
