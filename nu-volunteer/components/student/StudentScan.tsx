'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { useApp } from '@/components/providers/AppProviders';
import { Button, ErrorNote, Icon, SuccessNote, inputStyle } from '@/components/ui';
import { checkinApi, errorMessage, type CheckinResultDto } from '@/lib/api';
import { COLOR, glass } from '@/lib/design';

/** ถอดรหัสภาพถี่แค่ไหน — 10 ครั้งต่อวินาทีพอจับ QR ได้ทันโดยไม่กินซีพียูจนภาพกระตุก */
const DECODE_INTERVAL_MS = 100;
/** สแกนรหัสเดิมซ้ำภายในเวลานี้ให้เงียบไว้ — กล้องเห็น QR เดิมทุกเฟรม ไม่ใช่การสแกนใหม่ */
const REPEAT_QUIET_MS = 4_000;

type Phase = 'idle' | 'starting' | 'scanning' | 'sending';

export function StudentScan() {
  const { t } = useApp();

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [result, setResult] = useState<CheckinResultDto | null>(null);
  const [manual, setManual] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const geoRef = useRef<{ lat: number; lng: number } | null>(null);
  /** รหัสที่เพิ่งส่งไป + เวลาที่ส่ง — กันการยิงซ้ำจากเฟรมถัดไปที่ยังเห็น QR เดิม */
  const lastSentRef = useRef<{ code: string; at: number } | null>(null);
  /** อ่านค่าล่าสุดได้จากในลูป ซึ่งไม่เห็นค่า state ที่เปลี่ยนหลังตัวมันถูกสร้าง */
  const busyRef = useRef(false);

  /* พิกัดเป็นของแถม — ขอไว้เงียบ ๆ ถ้าผู้ใช้ไม่ให้ก็เช็กอินได้ตามปกติ */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => {
        /* ปฏิเสธหรือหาไม่เจอ — ไม่ใช่ข้อผิดพลาดที่ต้องแจ้ง */
      },
      { enableHighAccuracy: true, timeout: 8_000 },
    );
  }, []);

  const submit = useCallback(
    async (code: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setPhase('sending');
      setError('');
      try {
        const res = await checkinApi.redeem(code, geoRef.current);
        setResult(res.result);
      } catch (e) {
        setResult(null);
        setError(errorMessage(e));
      } finally {
        busyRef.current = false;
        // กล้องยังเปิดอยู่ก็กลับไปสแกนต่อ ผู้ใช้จะได้เช็กเอาต์ต่อได้โดยไม่ต้องกดเปิดใหม่
        setPhase(streamRef.current ? 'scanning' : 'idle');
      }
    },
    [],
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setPhase('idle');
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setPhase('starting');
    try {
      // facingMode: environment = กล้องหลัง ซึ่งเป็นตัวที่ใช้ส่องอะไรตรงหน้า
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('scanning');
    } catch (e) {
      setPhase('idle');
      setCameraError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? t('ไม่ได้รับอนุญาตให้ใช้กล้อง เปิดสิทธิ์กล้องในเบราว์เซอร์แล้วลองใหม่ หรือกรอกรหัสด้วยมือด้านล่าง')
          : t('เปิดกล้องไม่ได้ กรุณากรอกรหัสด้วยมือด้านล่างแทน'),
      );
    }
  }, [t]);

  /* ปิดกล้องเมื่อออกจากหน้า — ไม่งั้นไฟกล้องยังติดค้างหลังเปลี่ยนหน้าไปแล้ว */
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  /* ลูปถอดรหัสจากเฟรมวิดีโอ */
  useEffect(() => {
    if (phase !== 'scanning') return;

    const id = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, w, h);
      const decoded = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, {
        inversionAttempts: 'dontInvert',
      });
      if (!decoded?.data) return;

      const code = decoded.data.trim();
      const last = lastSentRef.current;
      if (last && last.code === code && Date.now() - last.at < REPEAT_QUIET_MS) return;

      lastSentRef.current = { code, at: Date.now() };
      void submit(code);
    }, DECODE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [phase, submit]);

  const live = phase === 'scanning' || phase === 'sending';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>
          {t('สแกน QR เพื่อเช็กอิน-เช็กเอาต์')}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('เปิดกล้องแล้วหันไปที่ QR ที่ผู้จัดกิจกรรมแสดง')}
        </div>
      </div>

      <div style={{ ...glass(22), padding: 18, display: 'grid', gap: 14, justifyItems: 'center' }}>
        <div
          style={{
            position: 'relative',
            width: 300,
            maxWidth: '100%',
            aspectRatio: '1 / 1',
            borderRadius: 18,
            overflow: 'hidden',
            background: 'rgba(31,41,55,.06)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: live ? 'block' : 'none',
            }}
          />
          {live ? (
            // กรอบเล็งกลางจอ ช่วยให้ผู้ใช้รู้ว่าต้องวาง QR ตรงไหน
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '18%',
                border: '3px solid rgba(255,255,255,.9)',
                borderRadius: 14,
                boxShadow: '0 0 0 9999px rgba(0,0,0,.18)',
              }}
            />
          ) : (
            <Icon name="qr_code_scanner" size={64} style={{ color: COLOR.hint }} />
          )}
        </div>

        {/* ผืนผ้าใบสำหรับอ่านพิกเซล ไม่ต้องให้ตาเห็น */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {live ? (
          <Button variant="secondary" icon="videocam_off" onClick={stopCamera}>
            {t('ปิดกล้อง')}
          </Button>
        ) : (
          <Button variant="primary" icon="photo_camera" onClick={startCamera} disabled={phase === 'starting'}>
            {phase === 'starting' ? t('กำลังเปิดกล้อง...') : t('เปิดกล้อง')}
          </Button>
        )}

        {cameraError ? <ErrorNote>{cameraError}</ErrorNote> : null}
      </div>

      {/* ── ผลการสแกน ── */}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {result ? (
        <SuccessNote>
          {result.kind === 'in'
            ? `${t('เช็กอินสำเร็จ')} · ${result.activityTitle}`
            : `${t('เช็กเอาต์สำเร็จ')} · ${result.activityTitle} · ${result.hoursComputed} ${t('ชม.')}`}
          {result.outOfRange ? ` · ${t('อยู่นอกรัศมีที่กำหนด ผู้จัดจะตรวจสอบอีกครั้ง')}` : ''}
        </SuccessNote>
      ) : null}

      {/* ── กรอกรหัสเอง ── */}
      <div style={{ ...glass(20), padding: 16, display: 'grid', gap: 10 }}>
        <span style={{ fontSize: 12.5, color: COLOR.body }}>
          {t('กล้องอ่านไม่ขึ้น? กรอกรหัสที่แสดงใต้ QR ได้เลย')}
        </span>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const code = manual.trim();
            if (!code) return;
            lastSentRef.current = { code, at: Date.now() };
            setManual('');
            void submit(code);
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value.toUpperCase())}
            placeholder="XXXXXXXXXXXX"
            autoComplete="off"
            spellCheck={false}
            style={{ ...inputStyle(false), flex: 1, minWidth: 180, letterSpacing: '.12em' }}
          />
          <Button variant="secondary" icon="check" type="submit" disabled={phase === 'sending' || !manual.trim()}>
            {t('ยืนยัน')}
          </Button>
        </form>
      </div>

      <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: COLOR.hint }}>
        <Icon name="info" size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        {t('รหัสของผู้จัดเปลี่ยนทุกนาที ถ้าขึ้นว่าหมดอายุให้สแกนจอใหม่อีกครั้ง')}
      </div>
    </div>
  );
}
