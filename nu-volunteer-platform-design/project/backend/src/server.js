import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { auth } from './routes/auth.js';
import { errorHandler } from './lib/errors.js';

const app = express();
app.set('trust proxy', 1);              // อยู่หลัง reverse proxy — ต้องตั้งเพื่อให้ req.ip ถูกต้อง
app.use(helmet());
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

const origins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
  credentials: true,                    // จำเป็นสำหรับ httpOnly cookie ข้ามโดเมน
}));

// production: บังคับ HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.get('x-forwarded-proto') === 'http') {
    return res.redirect(301, 'https://' + req.get('host') + req.originalUrl);
  }
  next();
});

app.get('/api/v1/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.use('/api/v1/auth', auth);
app.use(errorHandler);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log('NU Volunteer auth API on :' + port));
