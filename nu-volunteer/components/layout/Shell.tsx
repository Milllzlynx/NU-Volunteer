'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useApp, type Mood } from '@/components/providers/AppProviders';

const PALETTE = ['#E97171', '#A774F7', '#63D2A1', '#7AB8FF'];

/** ค่าบรรยากาศพื้นหลังตามสไตล์ (พอร์ตจาก themeVals() ของต้นแบบ) */
function atmosphere(mood: Mood) {
  // ค่าเริ่มต้น = "สมดุล (Balanced)"
  const a = {
    op: 0.26,
    blur: 160,
    base: 'linear-gradient(140deg,#FDF8F8 0%,#F3F8FF 48%,#F8F5FF 100%)',
  };
  if (mood === 'candy') {
    a.op = Math.min(0.62, a.op * 1.9);
    a.blur = Math.round(a.blur * 0.75);
    a.base = 'linear-gradient(140deg,#FFF3F1 0%,#EEF5FF 46%,#F7EEFF 100%)';
  } else if (mood === 'minimal') {
    a.op = a.op * 0.3;
    a.blur = Math.round(a.blur * 1.25);
    a.base = 'linear-gradient(140deg,#FCFCFD 0%,#FAFAFB 52%,#FBFBFC 100%)';
  } else if (mood === 'neon') {
    a.op = Math.min(0.7, a.op * 2.1);
    a.blur = Math.round(a.blur * 0.7);
    a.base = 'linear-gradient(140deg,#F4EEFF 0%,#EAF2FF 48%,#FFF0F4 100%)';
  }
  return a;
}

function blob(
  color: string,
  pos: CSSProperties,
  size: number,
  op: number,
  blur: number,
): CSSProperties {
  return {
    position: 'absolute',
    ...pos,
    width: size,
    height: size,
    borderRadius: '50%',
    background: color,
    opacity: op,
    filter: `blur(${blur}px)`,
  };
}

/** ชั้นพื้นหลัง: gradient พาสเทล + blob เบลอขนาดใหญ่ 4 ก้อน */
export function ShellBackground({ mood }: { mood: Mood }) {
  const a = atmosphere(mood);
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div style={blob(PALETTE[0], { top: '-14%', left: '-8%' }, 620, a.op, a.blur)} />
      <div style={blob(PALETTE[1], { top: '-6%', right: '-10%' }, 560, a.op, a.blur)} />
      <div style={blob(PALETTE[2], { bottom: '-16%', left: '14%' }, 600, a.op, a.blur)} />
      <div style={blob(PALETTE[3], { bottom: '-10%', right: '6%' }, 580, a.op, a.blur)} />
    </div>
  );
}

/**
 * คอนเทนเนอร์รากของทุกหน้า
 * .nuv-shell คือชั้นที่โหมดมืดใช้กลับสี — ทุกอย่างที่ต้องกลับสีต้องอยู่ข้างใน
 */
export function Shell({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { mood } = useApp();
  const a = atmosphere(mood);
  return (
    <div
      className="nuv-shell"
      style={{
        minHeight: '100vh',
        position: 'relative',
        background: a.base,
        isolation: 'isolate',
        ...style,
      }}
    >
      <ShellBackground mood={mood} />
      {children}
    </div>
  );
}
