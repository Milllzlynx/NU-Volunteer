'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, EmptyState, ErrorNote, Icon, Skeleton, SuccessNote, Tabs, inputStyle } from '@/components/ui';
import { ImageDropField } from '@/components/ui/ImageDropField';
import { useApp } from '@/components/providers/AppProviders';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { RichText } from '@/components/admin/RichText';
import { NewsEditor } from '@/components/admin/NewsEditor';
import { adminNewsApi, errorMessage, type AdminBannerRow, type AdminNewsRow, type BannerInput } from '@/lib/api';
import { COLOR, SEMANTIC, glass } from '@/lib/design';

type Section = 'news' | 'banners';
type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

const STATUS_META: Record<string, { label: string; tone: keyof typeof SEMANTIC; icon: string }> = {
  draft: { label: 'ฉบับร่าง', tone: 'neutral', icon: 'edit_note' },
  published: { label: 'เผยแพร่แล้ว', tone: 'success', icon: 'public' },
  archived: { label: 'เก็บเข้ากรุ', tone: 'warning', icon: 'inventory_2' },
};

const BANNER_TYPE_LABEL: Record<string, string> = {
  general: 'ทั่วไป',
  reminder: 'เตือนความจำ',
  update: 'อัปเดต',
};

const BLANK_BANNER: BannerInput = {
  title: '',
  desc: '',
  image: '',
  ctaLabel: '',
  ctaTarget: '',
  type: 'general',
  visible: true,
};

/**
 * ข่าวสารประชาสัมพันธ์ — จัดการสองอย่างที่คู่กันแต่คนละที่แสดงผล
 *
 * "ข่าว" (ตาราง News) คือบทความยาว ส่วน "แบนเนอร์" (ตาราง Banner) คือใบสไลด์บนหน้าหลัก
 * ของนิสิต เมนูในแถบข้างชื่อ newsBanners อยู่แล้ว จึงรวมไว้หน้าเดียวกันตามที่ออกแบบไว้
 *
 * ข้อควรรู้: แบนเนอร์แสดงผลจริงบนหน้าหลักของนิสิตทันที ส่วนข่าวยังไม่มีหน้าฝั่งผู้อ่าน
 * ในระบบ — เขียนเก็บไว้ได้แต่ยังไม่มีที่ให้นิสิตอ่าน (ดูบันทึกท้ายไฟล์)
 */
export function AdminNews() {
  const { t, isEn } = useApp();

  const [section, setSection] = useState<Section>('news');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [news, setNews] = useState<AdminNewsRow[]>([]);
  const [banners, setBanners] = useState<AdminBannerRow[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const [editing, setEditing] = useState<AdminNewsRow | 'new' | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmNews, setConfirmNews] = useState<AdminNewsRow | null>(null);
  const [confirmBanner, setConfirmBanner] = useState<AdminBannerRow | null>(null);

  const [bannerDraft, setBannerDraft] = useState<BannerInput>(BLANK_BANNER);
  const [bannerEditing, setBannerEditing] = useState<string | null>(null);
  const [addingBanner, setAddingBanner] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([adminNewsApi.list(ac.signal), adminNewsApi.banners(ac.signal)])
      .then(([n, b]) => {
        setNews(n.news);
        setBanners(b.banners);
        setTargets(b.targets);
        setLoadedOnce(true);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(errorMessage(e));
        setLoadedOnce(true);
      });
    return () => ac.abort();
  }, []);

  async function refreshNews() {
    const res = await adminNewsApi.list();
    setNews(res.news);
  }
  async function refreshBanners() {
    const res = await adminNewsApi.banners();
    setBanners(res.banners);
    setTargets(res.targets);
  }

  async function run(key: string, fn: () => Promise<void>, done?: string) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (done) setNotice(done);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const visibleNews = useMemo(() => {
    const q = query.trim().toLowerCase();
    return news.filter((n) => {
      if (statusFilter !== 'all' && n.status !== statusFilter) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.excerpt.toLowerCase().includes(q) ||
        n.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [news, statusFilter, query]);

  const counts = useMemo(
    () => ({
      all: news.length,
      draft: news.filter((n) => n.status === 'draft').length,
      published: news.filter((n) => n.status === 'published').length,
      archived: news.filter((n) => n.status === 'archived').length,
    }),
    [news],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>
          {t('ข่าวสารประชาสัมพันธ์')}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('บทความข่าว และแบนเนอร์สไลด์บนหน้าหลักของนิสิต')}
        </div>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {notice ? <SuccessNote>{notice}</SuccessNote> : null}

      <Tabs
        items={[
          { key: 'news' as Section, label: t('ข่าว'), count: news.length },
          { key: 'banners' as Section, label: t('แบนเนอร์หน้าหลัก'), count: banners.length },
        ]}
        value={section}
        onChange={(k) => {
          setSection(k);
          setEditing(null);
          setAddingBanner(false);
          setBannerEditing(null);
        }}
      />

      {section === 'news' ? (
        <>
          {/* ── ตัวกรองข่าว ── */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ค้นหาหัวข้อ เนื้อหา หรือป้ายกำกับ...')}
              aria-label={t('ค้นหาหัวข้อ เนื้อหา หรือป้ายกำกับ...')}
              style={{ ...inputStyle(false), flex: 1, minWidth: 200 }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label={t('กรองตามสถานะ')}
              style={{ ...inputStyle(false), width: 'auto', minWidth: 160 }}
            >
              <option value="all">{`${t('ทุกสถานะ')} (${counts.all})`}</option>
              <option value="draft">{`${t('ฉบับร่าง')} (${counts.draft})`}</option>
              <option value="published">{`${t('เผยแพร่แล้ว')} (${counts.published})`}</option>
              <option value="archived">{`${t('เก็บเข้ากรุ')} (${counts.archived})`}</option>
            </select>
            <Button
              variant="primary"
              icon={editing === 'new' ? 'close' : 'add'}
              onClick={() => setEditing(editing === 'new' ? null : 'new')}
            >
              {editing === 'new' ? t('ยกเลิก') : t('เขียนข่าวใหม่')}
            </Button>
          </div>

          {editing ? (
            <NewsEditor
              key={editing === 'new' ? 'new' : editing.id}
              initial={editing === 'new' ? null : editing}
              busy={busy === 'editor'}
              onCancel={() => setEditing(null)}
              onSave={(payload) =>
                run(
                  'editor',
                  async () => {
                    if (editing === 'new') await adminNewsApi.create(payload);
                    else await adminNewsApi.update(editing.id, payload);
                    await refreshNews();
                    setEditing(null);
                  },
                  editing === 'new' ? t('บันทึกข่าวใหม่แล้ว') : t('บันทึกแล้ว'),
                )
              }
            />
          ) : null}

          {!loadedOnce ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={104} radius={16} />
              ))}
            </div>
          ) : visibleNews.length === 0 ? (
            <div style={{ ...glass(20) }}>
              <EmptyState
                icon="newspaper"
                title={news.length ? t('ไม่พบข่าวที่ตรงกับเงื่อนไข') : t('ยังไม่มีข่าวในระบบ')}
                desc={news.length ? t('ลองเปลี่ยนคำค้นหรือสถานะ') : t('กด "เขียนข่าวใหม่" เพื่อเริ่มต้น')}
              />
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              {visibleNews.map((n) => (
                <NewsRow
                  key={n.id}
                  news={n}
                  isEn={isEn}
                  t={t}
                  busy={busy === n.id}
                  expanded={expanded === n.id}
                  onToggleExpand={() => setExpanded(expanded === n.id ? null : n.id)}
                  onEdit={() => {
                    setEditing(n);
                    setExpanded(null);
                  }}
                  onPatch={(payload, done) =>
                    run(
                      n.id,
                      async () => {
                        await adminNewsApi.update(n.id, payload);
                        await refreshNews();
                      },
                      done,
                    )
                  }
                  onDelete={() => setConfirmNews(n)}
                />
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 15px',
              borderRadius: 15,
              background: 'rgba(122,184,255,.14)',
              color: '#2E7BC4',
              fontSize: 12.5,
              lineHeight: 1.8,
            }}
          >
            <Icon name="info" size={17} style={{ flexShrink: 0 }} />
            {t('แบนเนอร์ที่ตั้งเป็น "แสดง" จะขึ้นสไลด์บนหน้าหลักของนิสิตทันที')}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              icon={addingBanner ? 'close' : 'add'}
              onClick={() => {
                setAddingBanner((v) => !v);
                setBannerDraft(BLANK_BANNER);
                setBannerEditing(null);
              }}
            >
              {addingBanner ? t('ยกเลิก') : t('เพิ่มแบนเนอร์')}
            </Button>
          </div>

          {addingBanner ? (
            <div style={{ ...glass(20), padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.ink }}>{t('แบนเนอร์ใหม่')}</div>
              <BannerFields value={bannerDraft} onChange={setBannerDraft} targets={targets} t={t} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button
                  variant="primary"
                  icon="save"
                  loading={busy === 'new-banner'}
                  disabled={!bannerDraft.title?.trim()}
                  onClick={() =>
                    run(
                      'new-banner',
                      async () => {
                        await adminNewsApi.createBanner(bannerDraft);
                        await refreshBanners();
                        setBannerDraft(BLANK_BANNER);
                        setAddingBanner(false);
                      },
                      t('เพิ่มแบนเนอร์แล้ว'),
                    )
                  }
                >
                  {t('บันทึก')}
                </Button>
              </div>
            </div>
          ) : null}

          {!loadedOnce ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {[0, 1].map((i) => (
                <Skeleton key={i} height={110} radius={16} />
              ))}
            </div>
          ) : banners.length === 0 ? (
            <div style={{ ...glass(20) }}>
              <EmptyState icon="ad_units" title={t('ยังไม่มีแบนเนอร์')} desc={t('หน้าหลักของนิสิตจะไม่แสดงสไลด์')} />
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              {banners.map((b, i) => (
                <BannerRow
                  key={b.id}
                  banner={b}
                  t={t}
                  targets={targets}
                  busy={busy === b.id}
                  editing={bannerEditing === b.id}
                  first={i === 0}
                  last={i === banners.length - 1}
                  onEdit={() => setBannerEditing(bannerEditing === b.id ? null : b.id)}
                  onSave={(payload) =>
                    run(
                      b.id,
                      async () => {
                        await adminNewsApi.updateBanner(b.id, payload);
                        await refreshBanners();
                        setBannerEditing(null);
                      },
                      t('บันทึกแล้ว'),
                    )
                  }
                  onMove={(dir) =>
                    run(b.id, async () => {
                      await adminNewsApi.updateBanner(b.id, { move: dir });
                      await refreshBanners();
                    })
                  }
                  onDelete={() => setConfirmBanner(b)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {confirmNews ? (
        <ConfirmDialog
          icon="delete"
          tone="danger"
          title={t('ลบข่าวนี้?')}
          body={`${confirmNews.title} — ${t('การลบย้อนกลับไม่ได้ ถ้าแค่ไม่อยากให้เห็น ใช้ "เก็บเข้ากรุ" แทน')}`}
          confirmLabel={t('ลบ')}
          busy={busy === confirmNews.id}
          onCancel={() => setConfirmNews(null)}
          onConfirm={() =>
            run(
              confirmNews.id,
              async () => {
                await adminNewsApi.remove(confirmNews.id);
                await refreshNews();
                setConfirmNews(null);
              },
              t('ลบข่าวแล้ว'),
            )
          }
        />
      ) : null}

      {confirmBanner ? (
        <ConfirmDialog
          icon="delete"
          tone="danger"
          title={t('ลบแบนเนอร์นี้?')}
          body={`${confirmBanner.title} — ${t('การลบย้อนกลับไม่ได้ ถ้าแค่ไม่อยากให้เห็น ใช้ "ซ่อน" แทน')}`}
          confirmLabel={t('ลบ')}
          busy={busy === confirmBanner.id}
          onCancel={() => setConfirmBanner(null)}
          onConfirm={() =>
            run(
              confirmBanner.id,
              async () => {
                await adminNewsApi.removeBanner(confirmBanner.id);
                await refreshBanners();
                setConfirmBanner(null);
              },
              t('ลบแบนเนอร์แล้ว'),
            )
          }
        />
      ) : null}
    </div>
  );
}

/* ───────────────── ข่าว ───────────────── */

function NewsRow({
  news: n,
  isEn,
  t,
  busy,
  expanded,
  onToggleExpand,
  onEdit,
  onPatch,
  onDelete,
}: {
  news: AdminNewsRow;
  isEn: boolean;
  t: (th: string) => string;
  busy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onPatch: (payload: { status?: string; pinned?: boolean }, done?: string) => void;
  onDelete: () => void;
}) {
  const meta = STATUS_META[n.status] ?? STATUS_META.draft;

  return (
    <li style={{ ...glass(18), padding: 16, display: 'grid', gap: 12, opacity: n.status === 'archived' ? 0.68 : 1 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {n.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- ภาพจากปลายทางภายนอกที่ผู้ดูแลกรอกเอง
          <img
            src={n.image}
            alt=""
            loading="lazy"
            style={{ width: 92, height: 64, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : null}

        <div style={{ flex: 1, minWidth: 190 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {n.pinned ? <Icon name="push_pin" size={16} style={{ color: '#E4572E' }} /> : null}
            <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{n.title}</span>
            <Badge tone={meta.tone} icon={meta.icon} label={t(meta.label)} />
            {n.scheduled ? <Badge tone="info" icon="schedule" label={t('ตั้งเวลาไว้')} /> : null}
            {n.audience === 'members' ? (
              <Badge tone="purple" icon="lock" label={t('เฉพาะสมาชิก')} />
            ) : null}
          </div>

          {n.excerpt ? (
            <div style={{ fontSize: 12.5, color: COLOR.body, marginTop: 5, lineHeight: 1.8 }}>{n.excerpt}</div>
          ) : null}

          {n.tags.length ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
              {n.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10.5,
                    padding: '2px 9px',
                    borderRadius: 999,
                    background: 'rgba(31,41,55,.07)',
                    color: COLOR.label,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 7, lineHeight: 1.8 }}>
            {n.publishedTh ? `${t('เผยแพร่')} ${isEn ? n.publishedEn : n.publishedTh} · ` : ''}
            {`${t('แก้ไขล่าสุด')} ${isEn ? n.updatedEn : n.updatedTh}`}
            {n.author ? ` · ${n.author}` : ''}
            {` · ${t('เปิดอ่าน')} ${n.views}`}
          </div>
        </div>
      </div>

      {expanded ? (
        <div style={{ padding: 14, borderRadius: 13, background: 'rgba(255,255,255,.55)' }}>
          <RichText source={n.body} />
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 11, borderTop: '1px solid rgba(31,41,55,.08)' }}>
        <Button variant="secondary" icon={expanded ? 'unfold_less' : 'unfold_more'} disabled={busy} onClick={onToggleExpand} style={smallBtn}>
          {expanded ? t('ย่อ') : t('อ่านเต็ม')}
        </Button>
        <Button variant="secondary" icon="edit" disabled={busy} onClick={onEdit} style={smallBtn}>
          {t('แก้ไข')}
        </Button>

        {n.status !== 'published' ? (
          <Button
            variant="secondary"
            icon="public"
            disabled={busy}
            onClick={() => onPatch({ status: 'published' }, t('เผยแพร่แล้ว'))}
            style={smallBtn}
          >
            {t('เผยแพร่')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            icon="inventory_2"
            disabled={busy}
            onClick={() => onPatch({ status: 'archived' }, t('เก็บเข้ากรุแล้ว'))}
            style={smallBtn}
          >
            {t('เก็บเข้ากรุ')}
          </Button>
        )}

        <Button
          variant="secondary"
          icon="push_pin"
          iconFill={n.pinned}
          disabled={busy}
          onClick={() => onPatch({ pinned: !n.pinned })}
          style={smallBtn}
        >
          {n.pinned ? t('เลิกปักหมุด') : t('ปักหมุด')}
        </Button>

        <Button variant="secondary" icon="delete" disabled={busy} onClick={onDelete} style={{ ...smallBtn, marginInlineStart: 'auto' }}>
          {t('ลบ')}
        </Button>
      </div>
    </li>
  );
}

/* ───────────────── แบนเนอร์ ───────────────── */

function BannerFields({
  value,
  onChange,
  targets,
  t,
}: {
  value: BannerInput;
  onChange: (v: BannerInput) => void;
  targets: string[];
  t: (th: string) => string;
}) {
  const set = <K extends keyof BannerInput>(key: K, v: BannerInput[K]) => onChange({ ...value, [key]: v });

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
        <label style={labelStyle}>
          {t('หัวข้อ')}
          <input value={value.title ?? ''} onChange={(e) => set('title', e.target.value)} style={inputStyle(false)} />
        </label>
        <label style={labelStyle}>
          {t('ชนิด')}
          <select value={value.type ?? 'general'} onChange={(e) => set('type', e.target.value)} style={inputStyle(false)}>
            {Object.entries(BANNER_TYPE_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={labelStyle}>
        {t('คำอธิบาย')}
        <input value={value.desc ?? ''} onChange={(e) => set('desc', e.target.value)} style={inputStyle(false)} />
      </label>

      <label style={labelStyle}>
        {t('ภาพแบนเนอร์')}
        {/* แบนเนอร์ขึ้นเต็มความกว้างบนหน้าแรก จึงใช้งบขนาดมาตรฐาน ไม่ย่อลงเท่าภาพหน้าปก */}
        <ImageDropField
          value={value.image ?? null}
          onChange={(next) => set('image', next ?? '')}
          icon="wallpaper"
          title={t('ภาพแบนเนอร์')}
          height={200}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
        <label style={labelStyle}>
          {t('ข้อความบนปุ่ม')}
          <input value={value.ctaLabel ?? ''} onChange={(e) => set('ctaLabel', e.target.value)} style={inputStyle(false)} />
        </label>
        <label style={labelStyle}>
          {t('ปุ่มพาไปหน้า')}
          <select value={value.ctaTarget ?? ''} onChange={(e) => set('ctaTarget', e.target.value)} style={inputStyle(false)}>
            <option value="">{t('ไม่มีปุ่ม')}</option>
            {targets.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: COLOR.body }}>
        <input
          type="checkbox"
          checked={value.visible ?? true}
          onChange={(e) => set('visible', e.target.checked)}
          style={{ width: 15, height: 15, cursor: 'pointer' }}
        />
        {t('แสดงบนหน้าหลักของนิสิต')}
      </label>
    </div>
  );
}

function BannerRow({
  banner: b,
  t,
  targets,
  busy,
  editing,
  first,
  last,
  onEdit,
  onSave,
  onMove,
  onDelete,
}: {
  banner: AdminBannerRow;
  t: (th: string) => string;
  targets: string[];
  busy: boolean;
  editing: boolean;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onSave: (payload: BannerInput) => void;
  onMove: (dir: 'up' | 'down') => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<BannerInput>({
    title: b.title,
    desc: b.desc,
    image: b.image ?? '',
    ctaLabel: b.ctaLabel,
    ctaTarget: b.ctaTarget,
    type: b.type,
    visible: b.visible,
  });

  return (
    <li style={{ ...glass(18), padding: 16, display: 'grid', gap: 12, opacity: b.visible ? 1 : 0.62 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {b.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- ภาพจากปลายทางภายนอกที่ผู้ดูแลกรอกเอง
          <img
            src={b.image}
            alt=""
            loading="lazy"
            style={{ width: 108, height: 64, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              width: 108,
              height: 64,
              borderRadius: 11,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(31,41,55,.06)',
              color: COLOR.hint,
            }}
          >
            <Icon name="image_not_supported" size={22} />
          </span>
        )}

        <div style={{ flex: 1, minWidth: 190 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>{b.title}</span>
            <Badge tone="neutral" label={t(BANNER_TYPE_LABEL[b.type] ?? b.type)} />
            {!b.visible ? <Badge tone="warning" icon="visibility_off" label={t('ซ่อนอยู่')} /> : null}
          </div>
          {b.desc ? (
            <div style={{ fontSize: 12.5, color: COLOR.body, marginTop: 5, lineHeight: 1.8 }}>{b.desc}</div>
          ) : null}
          {b.ctaLabel ? (
            <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 5 }}>
              {`${t('ปุ่ม')}: ${b.ctaLabel}${b.ctaTarget ? ` → ${b.ctaTarget}` : ''}`}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <OrderBtn icon="arrow_upward" label={t('เลื่อนขึ้น')} disabled={busy || first} onClick={() => onMove('up')} />
          <OrderBtn icon="arrow_downward" label={t('เลื่อนลง')} disabled={busy || last} onClick={() => onMove('down')} />
        </div>
      </div>

      {editing ? (
        <>
          <BannerFields value={draft} onChange={setDraft} targets={targets} t={t} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onEdit} style={smallBtn}>
              {t('ยกเลิก')}
            </Button>
            <Button variant="primary" icon="save" loading={busy} disabled={!draft.title?.trim()} onClick={() => onSave(draft)} style={smallBtn}>
              {t('บันทึก')}
            </Button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 11, borderTop: '1px solid rgba(31,41,55,.08)' }}>
          <Button variant="secondary" icon="edit" disabled={busy} onClick={onEdit} style={smallBtn}>
            {t('แก้ไข')}
          </Button>
          <Button
            variant="secondary"
            icon={b.visible ? 'visibility_off' : 'visibility'}
            disabled={busy}
            onClick={() => onSave({ visible: !b.visible })}
            style={smallBtn}
          >
            {b.visible ? t('ซ่อน') : t('แสดง')}
          </Button>
          <Button variant="secondary" icon="delete" disabled={busy} onClick={onDelete} style={{ ...smallBtn, marginInlineStart: 'auto' }}>
            {t('ลบ')}
          </Button>
        </div>
      )}
    </li>
  );
}

/* ───────────────── ชิ้นส่วนเล็ก ───────────────── */

const smallBtn: React.CSSProperties = { padding: '8px 14px', fontSize: 12.5 };
const labelStyle: React.CSSProperties = { display: 'grid', gap: 5, fontSize: 12, color: COLOR.label };

function OrderBtn({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="nuv-iconbtn"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        borderRadius: 11,
        border: '1px solid rgba(31,41,55,.1)',
        background: 'rgba(255,255,255,.6)',
        color: COLOR.body,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}
