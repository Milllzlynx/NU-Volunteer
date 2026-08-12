/** โลโก้แบรนด์ — .nuv-keep กันไม่ให้โดนกลับสีในโหมดมืด */
export function BrandMark({ size = 38, radius = 12 }: { size?: number; radius?: number }) {
  return (
    <div
      className="nuv-keep"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: 'linear-gradient(135deg,#E97171,#A774F7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 5px 14px rgba(167,116,247,.35)',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{ width: size * 0.58, height: size * 0.58, display: 'block' }}
        aria-hidden="true"
      >
        <path
          d="M12 9.4c-1.25-2.6-5.2-2.3-5.2.95 0 2.3 3 4.3 5.2 5.75 2.2-1.45 5.2-3.45 5.2-5.75 0-3.25-3.95-3.55-5.2-.95Z"
          fill="#fff"
        />
        <path
          d="M3.4 15.2c0 4.2 3.95 6.5 8.6 6.5s8.6-2.3 8.6-6.5"
          stroke="#fff"
          strokeWidth="2.1"
          strokeLinecap="round"
          opacity=".8"
        />
      </svg>
    </div>
  );
}
