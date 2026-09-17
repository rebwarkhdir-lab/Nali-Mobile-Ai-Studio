import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { getKnownBatteryCapacity } from './src/lib/mobileSpecsDatabase';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json({ limit: '50mb' }));

  const SPECS_CACHE_PATH = path.join(process.cwd(), '.specs_cache.json');
  const getSpecsCache = (): Record<string, string> => {
    try {
      if (fs.existsSync(SPECS_CACHE_PATH)) {
        return JSON.parse(fs.readFileSync(SPECS_CACHE_PATH, 'utf-8'));
      }
    } catch {}
    return {};
  };

  const saveSpecsCache = (cache: Record<string, string>) => {
    try {
      fs.writeFileSync(SPECS_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    } catch {}
  };

  // AI-Powered Smart Specs Endpoint with Multi-tier Caching & Safe Fallback
  app.get('/api/smart-specs', async (req, res) => {
    try {
      const brand = String(req.query.brand || '').trim();
      const model = String(req.query.model || '').trim();

      if (!brand || !model || model.length < 2) {
        return res.json({ battery: '' });
      }

      const bLower = brand.toLowerCase();
      const mLower = model.toLowerCase();

      // Exclude non-Android if requested
      if (bLower === 'apple' || mLower.includes('iphone') || bLower === 'nokia') {
        return res.json({ battery: '' });
      }

      const cacheKey = `${bLower}:::${mLower}`;
      const cache = getSpecsCache();

      if (cache[cacheKey]) {
        return res.json({ battery: cache[cacheKey], source: 'cache' });
      }

      // Check offline GSMArena catalog first
      const catalogCapacity = getKnownBatteryCapacity(brand, model);
      if (catalogCapacity) {
        cache[cacheKey] = catalogCapacity;
        saveSpecsCache(cache);
        return res.json({ battery: catalogCapacity, source: 'offline-catalog' });
      }

      // Check if Gemini API key exists
      if (!process.env.GEMINI_API_KEY) {
        return res.json({ battery: '', source: 'no-key' });
      }

      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const prompt = `You are a mobile hardware specifications parser with complete GSMArena technical data.
Task: Identify the exact official battery capacity in mAh for "${brand} ${model}" as listed on GSMArena.
Verified GSMArena Data Guidelines:
- Honor X7d: 6500 mAh
- Honor 600 Lite: 6520 mAh
- Honor X9d: 8300 mAh
- Honor X9c: 6600 mAh
- Honor X9b: 5800 mAh
- Honor X7c: 6000 mAh
- Honor X7b: 6000 mAh
- Honor X7a: 5330 mAh
- Honor X7 (original): 5000 mAh
- Do not confuse newer models (like X7d or X7c) with the original X7 (5000 mAh).
- If the model is a real device, respond in strict JSON format: {"battery": "<number>", "source": "gsmarena"}. Example: {"battery": "6500", "source": "gsmarena"}.
- If the model is completely unknown or not found, respond: {"battery": ""}.
- NEVER guess an unverified 5000 mAh.`;

        let rawResponse = '';
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            }
          });
          rawResponse = response.text || '';
        } catch {
          try {
            const fallbackResp = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              }
            });
            rawResponse = fallbackResp.text || '';
          } catch {
            // Both model attempts failed or timed out
          }
        }

        if (rawResponse) {
          try {
            const parsed = JSON.parse(rawResponse);
            if (parsed && parsed.battery) {
              const cleaned = String(parsed.battery).replace(/[^0-9]/g, '');
              if (cleaned.length >= 3 && cleaned.length <= 5) {
                cache[cacheKey] = cleaned;
                saveSpecsCache(cache);
                return res.json({ battery: cleaned, source: 'ai-gsmarena' });
              }
            }
          } catch {
            const extractedNumber = rawResponse.replace(/[^0-9]/g, '');
            if (extractedNumber && extractedNumber.length >= 3 && extractedNumber.length <= 5) {
              cache[cacheKey] = extractedNumber;
              saveSpecsCache(cache);
              return res.json({ battery: extractedNumber, source: 'ai-raw' });
            }
          }
        }
      } catch {
        // Silent catch for Gemini rate limits (429) or timeouts
      }

      // Do NOT guess an unverified 5000 mAh
      return res.json({ battery: '', source: 'not-found' });
    } catch {
      return res.json({ battery: '', source: 'error' });
    }
  });

  app.post('/api/log-error', (req, res) => {
    try {
      fs.appendFileSync('frontend-error.log', JSON.stringify(req.body) + '\n');
    } catch (err) {
      console.warn('Failed to write to frontend-error.log:', err);
    }
    res.json({ ok: true });
  });
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Serve static assets from public/ (manifest, icons, service worker)
  app.use(express.static(path.join(process.cwd(), 'public')));

  const SUPABASE_CONFIG_PATH = path.join(process.cwd(), '.supabase_config.json');
  const WIDGET_DATA_PATH = path.join(process.cwd(), '.widget_data.json');
  const STORE_BRANDING_PATH = path.join(process.cwd(), '.store_branding.json');

  // Helper to read cached widget data
  const getWidgetData = () => {
    try {
      if (fs.existsSync(WIDGET_DATA_PATH)) {
        return JSON.parse(fs.readFileSync(WIDGET_DATA_PATH, 'utf-8'));
      }
    } catch {}
    return {
      sales: [],
      debts: [],
      lowStock: [],
      stats: {
        todaySalesCount: 0,
        todaySalesRevenueUSD: 0,
        todaySalesRevenueIQD: 0,
        pendingDebtsCount: 0,
        totalDebtDueUSD: 0,
        lowStockAlertCount: 0
      },
      lastUpdated: new Date().toISOString(),
      storeName: 'NALI MOBILE',
      exchangeRate: 1530
    };
  };

  // Endpoint for iPhone widgets, Safari, and Apple Scriptable apps
  app.get('/api/widgets/data', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const data = getWidgetData();
    res.json(data);
  });

  // Endpoint to sync client-side widget state to server
  app.post('/api/widgets/sync', (req, res) => {
    try {
      const incoming = req.body;
      if (incoming && typeof incoming === 'object') {
        fs.writeFileSync(WIDGET_DATA_PATH, JSON.stringify(incoming, null, 2));
      }
      res.json({ ok: true, savedAt: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // Direct push endpoint for cashier sales
  app.post('/api/widgets/push-sale', (req, res) => {
    try {
      const sale = req.body;
      const current = getWidgetData();
      const updatedSales = [sale, ...(current.sales || [])].slice(0, 20);
      current.sales = updatedSales;
      current.stats = {
        ...current.stats,
        todaySalesCount: (current.stats.todaySalesCount || 0) + 1,
        todaySalesRevenueUSD: (current.stats.todaySalesRevenueUSD || 0) + (Number(sale.total) || 0),
        lastCashierSaleTime: sale.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      current.lastUpdated = new Date().toISOString();
      fs.writeFileSync(WIDGET_DATA_PATH, JSON.stringify(current, null, 2));
      res.json({ ok: true, saleId: sale.id });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/supabase-config', (_req, res) => {
    try {
      let saved = { url: '', anonKey: '' };
      if (fs.existsSync(SUPABASE_CONFIG_PATH)) {
        try {
          saved = JSON.parse(fs.readFileSync(SUPABASE_CONFIG_PATH, 'utf-8'));
        } catch {}
      }
      const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || saved.url || '';
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || saved.anonKey || '';
      const isConfigured = Boolean(
        url && 
        url.trim().length > 0 && 
        !url.includes('placeholder.supabase.co') && 
        anonKey && 
        anonKey !== 'placeholder'
      );
      res.json({
        supabaseUrl: url,
        supabaseAnonKey: anonKey,
        isConfigured
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/supabase-config', (req, res) => {
    try {
      const { supabaseUrl, supabaseAnonKey } = req.body;
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(400).json({ error: 'supabaseUrl and supabaseAnonKey are required.' });
      }
      const cleanedUrl = String(supabaseUrl).trim().replace(/\/+$/, '');
      const cleanedKey = String(supabaseAnonKey).trim();

      fs.writeFileSync(SUPABASE_CONFIG_PATH, JSON.stringify({
        url: cleanedUrl,
        anonKey: cleanedKey,
        savedAt: new Date().toISOString()
      }, null, 2));

      res.json({
        success: true,
        supabaseUrl: cleanedUrl,
        isConfigured: true,
        message: 'Supabase configuration saved on server. All devices now share this connection.'
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/store-branding', (_req, res) => {
    try {
      if (fs.existsSync(STORE_BRANDING_PATH)) {
        const raw = fs.readFileSync(STORE_BRANDING_PATH, 'utf-8');
        const branding = JSON.parse(raw);
        return res.json({ success: true, branding });
      }
      return res.json({ success: false, branding: null });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.post('/api/store-branding', (req, res) => {
    try {
      const incoming = req.body;
      if (incoming && typeof incoming === 'object') {
        fs.writeFileSync(STORE_BRANDING_PATH, JSON.stringify({
          ...incoming,
          _serverSavedAt: new Date().toISOString()
        }, null, 2));
      }
      res.json({ success: true, savedAt: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  app.get('/api/currency-rates', async (_req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch('https://cashnrx.innovation-pulsehub.com/api/mobile/currency-rates', {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (error: any) {
      console.warn('Currency rates live fetch notice:', error?.message);
    }

    // Graceful fallback rate so POS exchange rate never crashes
    res.json({
      success: true,
      data: {
        rates: [
          { currency: 'USD', buy_rate: 153000, sell_rate: 153500 }
        ]
      },
      isFallback: true
    });
  });

  const isProduction = process.env.NODE_ENV === 'production' || process.argv[1]?.endsWith('server.cjs');
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Disable HMR entirely to prevent WebSocket connection errors in this environment
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        next();
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
