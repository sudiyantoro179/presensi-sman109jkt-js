import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI client safely
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API: Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    school: 'SMA NEGERI 109 JAKARTA',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// API: Gemini Text-to-Speech (Indonesian voice announcement)
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API Key not configured',
        fallback: true,
      });
    }

    // Call gemini-3.8-flash-lite-tts
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Ucapkan dalam Bahasa Indonesia yang ramah, hangat, dan jelas untuk pengumuman sekolah: ${text}`,
              speechMetadata: {
                style: 'Friendly, warm, and clear school receptionist',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice, // 'Kore', 'Puck', 'Zephyr', 'Fenrir', 'Charon'
            },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio data received from Gemini TTS' });
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    res.status(500).json({
      error: error.message || 'Failed to synthesize speech',
      fallback: true,
    });
  }
});

// API: Gemini 3.8 Flash Attendance Analysis & Executive Summary
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { attendanceSummary, classStats, period } = req.body;
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key not configured' });
    }

    const systemPrompt = `Anda adalah Asisten Analisis Presensi AI untuk pimpinan, Guru BK, dan Wali Kelas di SMA NEGERI 109 JAKARTA.
Analisis data kehadiran berikut secara mendalam, objektif, dan solutif.
Berikan output terstruktur dalam format JSON dengan format persis:
{
  "ringkasanEksekutif": "Uraian komprehensif tingkat kehadiran sekolah dalam 2-3 paragraf",
  "trenKehadiran": ["Poin tren 1", "Poin tren 2", "Poin tren 3"],
  "sorotanPerKelas": [
    { "kelas": "nama kelas", "status": "Teladan/Perlu Perhatian/Kritis", "catatan": "alasan" }
  ],
  "rekomendasiGuruBK": ["Rekomendasi 1 untuk penanganan siswa bermasalah", "Rekomendasi 2"],
  "rekomendasiWaliKelas": ["Tindakan 1 komunikasi orang tua", "Tindakan 2"]
}`;

    const prompt = `Data Presensi SMA NEGERI 109 JAKARTA periode ${period || 'Hari Ini / Bulan Ini'}:
Ringkasan KPI: ${JSON.stringify(attendanceSummary || {})}
Statistik per Kelas: ${JSON.stringify(classStats || [])}

Tolong hasilkan analisis presensi cerdas sesuai format JSON yang ditentukan.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { rawText: text };
    }

    res.json({ analysis: parsed });
  } catch (error: any) {
    console.error('Error analyzing attendance:', error);
    res.status(500).json({ error: error.message || 'Gagal melakukan analisis AI' });
  }
});

// API: Gemini 3.8 Flash Attendance Consultation Chatbot
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, contextData, history = [] } = req.body;
    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key not configured' });
    }

    const systemInstruction = `Anda adalah Asisten Cerdas Presensi & Kesiswaan SMA NEGERI 109 JAKARTA.
Anda ramah, profesional, memahami tata tertib sekolah, dan siap membantu menjawab pertanyaan seputar data murid, kehadiran, surat peringatan (SP), konseling BK, dan tindak lanjut absensi.
Gunakan data konteks berikut jika relevan:
${JSON.stringify(contextData || {})}`;

    const contents = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
      },
    });

    res.json({ reply: response.text || 'Tidak ada jawaban dari AI.' });
  } catch (error: any) {
    console.error('Error in chatbot:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses pesan AI' });
  }
});

// Development: Vite middleware. Production: Static files
async function setupVite() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server SMAN 109 Jakarta listening on http://0.0.0.0:${port}`);
  });
}

setupVite();
