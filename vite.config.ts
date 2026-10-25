import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

// Vite plugin to provide API proxy routes for Gemini TTS, Analysis, and Chatbot
function geminiApiPlugin(): Plugin {
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

  return {
    name: 'gemini-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        // Helper to read incoming JSON body
        const readBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk) => {
              data += chunk;
            });
            req.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch {
                resolve({});
              }
            });
          });
        };

        const sendJson = (status: number, payload: any) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        };

        // Health endpoint
        if (req.url === '/api/health') {
          return sendJson(200, {
            status: 'ok',
            school: 'SMA NEGERI 109 JAKARTA',
            hasApiKey: !!process.env.GEMINI_API_KEY,
          });
        }

        // Gemini TTS endpoint (Indonesian voice announcement)
        if (req.url === '/api/tts' && req.method === 'POST') {
          try {
            const body = await readBody();
            const { text, voice = 'Kore' } = body;
            const ai = getAiClient();
            if (!ai) {
              return sendJson(503, { error: 'Gemini API Key not configured', fallback: true });
            }

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
                    prebuiltVoiceConfig: { voiceName: voice },
                  },
                },
              },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) {
              return sendJson(500, { error: 'No audio data received', fallback: true });
            }

            return sendJson(200, { audioBase64: base64Audio, mimeType: 'audio/wav' });
          } catch (e: any) {
            return sendJson(500, { error: e.message || 'TTS Error', fallback: true });
          }
        }

        // Gemini Analysis endpoint
        if (req.url === '/api/gemini/analyze' && req.method === 'POST') {
          try {
            const body = await readBody();
            const { attendanceSummary, classStats, period } = body;
            const ai = getAiClient();
            if (!ai) {
              return sendJson(503, { error: 'Gemini API Key not configured' });
            }

            const prompt = `Data Presensi SMA NEGERI 109 JAKARTA periode ${period || 'Hari Ini'}:
Ringkasan KPI: ${JSON.stringify(attendanceSummary || {})}
Statistik per Kelas: ${JSON.stringify(classStats || [])}

Tolong hasilkan analisis presensi cerdas sesuai format JSON yang ditentukan.`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                systemInstruction: `Anda adalah Asisten Analisis Presensi AI untuk pimpinan, Guru BK, dan Wali Kelas di SMA NEGERI 109 JAKARTA.
Berikan output terstruktur dalam format JSON:
{
  "ringkasanEksekutif": "Uraian 2-3 paragraf",
  "trenKehadiran": ["Poin 1", "Poin 2", "Poin 3"],
  "sorotanPerKelas": [{ "kelas": "nama", "status": "Teladan/Perlu Perhatian", "catatan": "alasan" }],
  "rekomendasiGuruBK": ["Rekomendasi 1", "Rekomendasi 2"],
  "rekomendasiWaliKelas": ["Tindakan 1", "Tindakan 2"]
}`,
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
            return sendJson(200, { analysis: parsed });
          } catch (e: any) {
            return sendJson(500, { error: e.message || 'Analysis error' });
          }
        }

        // Gemini Chatbot endpoint
        if (req.url === '/api/gemini/chat' && req.method === 'POST') {
          try {
            const body = await readBody();
            const { message, contextData, history = [] } = body;
            const ai = getAiClient();
            if (!ai) {
              return sendJson(503, { error: 'Gemini API Key not configured' });
            }

            const contents = [
              ...history.map((h: { role: string; content: string }) => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }],
              })),
              { role: 'user', parts: [{ text: message }] },
            ];

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents,
              config: {
                systemInstruction: `Anda adalah Asisten Cerdas Presensi & Kesiswaan SMA NEGERI 109 JAKARTA. Ramah, profesional, memahami aturan absensi kesiswaan. Konteks: ${JSON.stringify(contextData || {})}`,
              },
            });

            return sendJson(200, { reply: response.text || 'Tidak ada balasan.' });
          } catch (e: any) {
            return sendJson(500, { error: e.message || 'Chat error' });
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
