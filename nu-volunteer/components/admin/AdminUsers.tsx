'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, EmptyState, ErrorNote, Icon, Skeleton, Tabs, inputStyle } from '@/components/ui';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useApp } from '@/components/providers/AppProviders';
import { Avatar } from '@/components/activity/Avatar';
import { adminApi, errorMessage, type AdminUserRow, type AdminUserCounts } from '@/lib/api';
import { COLOR, ROLE_ACCENT, ROLE_LABEL, ROLE_LABEL_EN, SEMANTIC, glass } from '@/lib/design';

type TabKey = 'all' | 'students' | 'organizers' | 'admins' | 'suspended' | 'deletion';

/** แต่ละแท็บแปลงเป็นพารามิเตอร์ที่ปลายทางเข้าใจ — role กับ state แยกกันคนละตัวกรอง */
const TABS: { key: TabKey; label: string; role?: string; state?: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'students', label: 'นิสิต', role: 'student' },
  { key: 'organizers', label: 'ผู้จัดกิจกรรม', role: 'organizer' },
  { key: 'admins', label: 'ผู้ดูแลระบบ', role: 'admin' },
  { key: 'suspended', label: 'ถูกระงับ', state: 'suspended' },
  { key: 'deletion', label: 'ขอลบบัญชี', state: 'deletion' },
];

const ROLES = ['student', 'organizer', 'admin'];

/** หน่วงคีย์ก่อนยิงค้นหา — พิมพ์ต่อเนื่องไม่ควรกลายเป็นคำขอทีละตัวอักษร */
const SEARCH_DELAY = 350;

/**
 * จัดการผู้ใช้งาน — หน้าที่เฉพาะของแอดมินที่สุดในระบบ
 *
 * ทั้งการเปลี่ยนบทบาทและการระงับบัญชีถูกกันไว้ที่ปลายทาง API อีกชั้นเสมอ
 * ปุ่มที่ถูกปิดในหน้านี้จึงเป็นการบอกล่วงหน้าว่าจะไม่สำเร็จ ไม่ใช่ตัวกลไกความปลอดภัย
 *
 * @param selfId บัญชีของแอดมินที่เปิดหน้านี้ — ใช้ปิดปุ่มของแถวตัวเอง
 */
export function AdminUsers({ selfId }: { selfId: string }) {
  const { t, isEn } = useApp();

  const [tab, setTab] = useState<TabKey>('all');
  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const [faculty, setFaculty] = useState('');

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [counts, setCounts] = useState<AdminUserCounts | null>(null);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserRow | null>(null);

  /*
    สถานะกำลังโหลดคำนวณจาก "ชุดตัวกรองที่ข้อมูลบนจอมาจาก" เทียบกับชุดที่เลือกอยู่ตอนนี้
    ไม่ได้เก็บเป็น state แยกแล้วสั่ง setLoading(true) ตอนเริ่ม effect เพราะ eslint
    ของโปรเจกต์นี้ห้าม setState ตรง ๆ ในตัว effect (react-hooks/set-state-in-effect)
    ผลพลอยได้คือไม่มีทางที่ธงกำลังโหลดจะค้างไม่ตรงกับข้อมูลที่แสดงอยู่
  */
  const filterKey = `${tab}|${query}|${faculty}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== filterKey;

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(rawQuery.trim()), SEARCH_DELAY);
    return () => window.clearTimeout(id);
  }, [rawQuery]);

  const active = useMemo(() => TABS.find((x) => x.key === tab) ?? TABS[0], [tab]);

  const load = useCallback(
    async (nextPage: number, signal?: AbortSignal) => {
      const res = await adminApi.users(
        { q: query, role: active.role, state: active.state, faculty, page: nextPage },
        signal,
      );
      return res;
    },
    [query, active, faculty],
  );

  // เปลี่ยนแท็บ คำค้น หรือคณะ = เริ่มนับหน้าใหม่เสมอ
  useEffect(() => {
    const ac = new AbortController();

    load(1, ac.signal)
      .then((res) => {
        setRows(res.users);
        setCounts(res.counts);
        setFaculties(res.faculties);
        setTotal(res.total);
        setHasMore(res.hasMore);
        setPage(1);
        setError(null);
        setLoadedKey(filterKey);
      })
      .catch((e) => {
        // ยกเลิกเพราะผู้ใช้เปลี่ยนตัวกรองระหว่างโหลด ไม่ใช่ข้อผิดพลาดที่ต้องแจ้ง
        // และต้องไม่ประทับ loadedKey ด้วย ไม่งั้นโครงร่างจะหายทั้งที่ยังไม่มีข้อมูล
        if (ac.signal.aborted) return;
        setError(errorMessage(e));
        setRows([]);
        setTotal(0);
        setHasMore(false);
        setLoadedKey(filterKey);
      });

    return () => ac.abort();
  }, [load, filterKey]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await load(page + 1);
      setRows((prev) => [...prev, ...res.users]);
      setHasMore(res.hasMore);
      setPage((p) => p + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  /** ส่งคำสั่งแก้บัญชีหนึ่งราย แล้วอัปเดตแถวนั้นในที่ — ไม่โหลดทั้งตารางใหม่ */
  async function patch(id: string, payload: { role?: string; active?: boolean; clearDeletion?: boolean }) {
    setBusyId(id);
    setError(null);
    try {
      const res = await adminApi.updateUser(id, payload);
      setRows((prev) =>
        prev.map((u) =>
          u.id === id
            ? { ...u, role: res.user.role, active: res.user.active, deletionRequested: res.user.deletionRequested }
            : u,
        ),
      );
      // ตัวเลขบนแท็บเปลี่ยนไปแล้ว ดึงชุดใหม่มาแทนแบบเงียบ ๆ ไม่ต้องขึ้นสถานะกำลังโหลด
      load(1)
        .then((fresh) => setCounts(fresh.counts))
        .catch(() => {
          /* ตัวเลขบนแท็บคลาดเคลื่อนชั่วคราวไม่ใช่เรื่องที่ต้องรบกวนผู้ใช้ */
        });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  /**
   * ลบบัญชีถาวร
   *
   * เอาแถวออกจากรายการทันทีแทนที่จะโหลดใหม่ทั้งหน้า เพราะผู้ดูแลมักลบทีละหลายบัญชี
   * แล้วค่อยดึงตัวเลขบนแท็บมาแทนแบบเงียบ ๆ เหมือนตอน patch
   */
  async function removeUser(target: AdminUserRow) {
    setBusyId(target.id);
    setError(null);
    try {
      await adminApi.deleteUser(target.id);
      setRows((prev) => prev.filter((u) => u.id !== target.id));
      setTotal((n) => Math.max(0, n - 1));
      setConfirmDelete(null);
      load(1)
        .then((fresh) => setCounts(fresh.counts))
        .catch(() => {
          /* ตัวเลขบนแท็บคลาดเคลื่อนชั่วคราวไม่ใช่เรื่องที่ต้องรบกวนผู้ใช้ */
        });
    } catch (e) {
      // ด่านกันลบฝั่งเซิร์ฟเวอร์ตอบมาเป็นข้อความอธิบายเหตุผล ต้องให้ผู้ใช้เห็น
      setError(errorMessage(e));
      setConfirmDelete(null);
    } finally {
      setBusyId(null);
    }
  }

  const tabItems = TABS.map((x) => ({
    key: x.key,
    label: t(x.label),
    count: counts
      ? x.key === 'all'
        ? counts.all
        : x.key === 'students'
          ? counts.students
          : x.key === 'organizers'
            ? counts.organizers
            : x.key === 'admins'
              ? counts.admins
              : x.key === 'suspended'
                ? counts.suspended
                : counts.deletion
      : undefined,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'nuFadeUp .3s ease' }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 600, color: COLOR.ink, lineHeight: 1.6 }}>
          {t('จัดการผู้ใช้งาน')}
        </div>
        <div style={{ fontSize: 13, color: COLOR.label, marginTop: 4 }}>
          {t('เปลี่ยนบทบาท ระงับบัญชี และดูคำขอลบบัญชีของผู้ใช้ทั้งระบบ')}
        </div>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <Tabs items={tabItems} value={tab} onChange={setTab} />

      {/* ── ค้นหาและกรองตามคณะ ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder={t('ค้นหาชื่อ อีเมล หรือรหัสนิสิต...')}
          aria-label={t('ค้นหาชื่อ อีเมล หรือรหัสนิสิต...')}
          style={{ ...inputStyle(false), flex: 1, minWidth: 200 }}
        />
        <select
          value={faculty}
          onChange={(e) => setFaculty(e.target.value)}
          aria-label={t('กรองตามคณะ')}
          style={{ ...inputStyle(false), width: 'auto', minWidth: 170 }}
        >
          <option value="">{t('ทุกคณะ')}</option>
          {faculties.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div style={{ fontSize: 12, color: COLOR.hint }}>
        {loading ? t('กำลังโหลด...') : `${t('แสดง')} ${rows.length} ${t('จาก')} ${total} ${t('คน')}`}
      </div>

      {/* ── รายชื่อ ── */}
      {loading ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={92} radius={16} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div style={{ ...glass(20) }}>
          <EmptyState
            icon="person_search"
            title={t('ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข')}
            desc={t('ลองเปลี่ยนคำค้น แท็บ หรือคณะที่เลือกไว้')}
          />
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {rows.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={u.id === selfId}
              busy={busyId === u.id}
              isEn={isEn}
              t={t}
              onPatch={(payload) => patch(u.id, payload)}
              onAskDelete={() => setConfirmDelete(u)}
            />
          ))}
        </ul>
      )}

      {hasMore && !loading ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button variant="secondary" icon="expand_more" loading={loadingMore} onClick={loadMore}>
            {t('โหลดเพิ่ม')}
          </Button>
        </div>
      ) : null}

      {/* บอกให้ครบว่าอะไรจะหายไปด้วย — ตัวเลขมาจากแถวที่โหลดมาแล้ว ไม่ต้องเรียกเพิ่ม */}
      {confirmDelete ? (
        <ConfirmDialog
          icon="delete_forever"
          tone="danger"
          title={t('ลบบัญชีนี้ถาวร?')}
          body={[
            `${confirmDelete.name || confirmDelete.email} · ${confirmDelete.email}`,
            confirmDelete.registrations > 0
              ? `${t('ใบลงทะเบียน')} ${confirmDelete.registrations} ${t('รายการ')} ${t('จะถูกลบไปด้วย')}`
              : '',
            t('ชั่วโมงสะสม ใบประกาศ รีวิว และประวัติแชทของบัญชีนี้จะหายไปทั้งหมด และย้อนกลับไม่ได้'),
            t('ถ้าต้องการแค่ไม่ให้เข้าใช้งาน ให้กดระงับบัญชีแทน ข้อมูลจะยังอยู่ครบ'),
          ]
            .filter(Boolean)
            .join('\n')}
          confirmLabel={t('ลบถาวร')}
          busy={busyId === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => void removeUser(confirmDelete)}
        />
      ) : null}
    </div>
  );
}

/* ───────────────── ชิ้นส่วนย่อย ───────────────── */

function UserRow({
  user: u,
  isSelf,
  busy,
  isEn,
  t,
  onPatch,
  onAskDelete,
}: {
  user: AdminUserRow;
  isSelf: boolean;
  busy: boolean;
  isEn: boolean;
  t: (th: string) => string;
  onPatch: (payload: { role?: string; active?: boolean; clearDeletion?: boolean }) => void;
  onAskDelete: () => void;
}) {
  // แถวของตัวเองเท่านั้นที่แก้ไม่ได้ — กันการล็อกตัวเองออกจากระบบ (ปลายทางกันซ้ำอีกชั้น)
  const locked = isSelf;

  const accent = ROLE_ACCENT[u.role] ?? '#1F2937';
  const roleLabel = isEn ? ROLE_LABEL_EN[u.role] : ROLE_LABEL[u.role];

  return (
    <li style={{ ...glass(18), padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <Avatar name={u.name || u.email} src={u.avatarUrl} size={46} />

        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: COLOR.ink }}>
              {u.name || u.email}
            </span>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 500,
                background: `${accent}22`,
                color: accent,
              }}
            >
              {roleLabel}
            </span>
            {!u.active ? <Badge tone="danger" icon="block" label={t('ถูกระงับ')} /> : null}
            {u.deletionRequested ? (
              <Badge tone="warning" icon="person_remove" label={t('ขอลบบัญชี')} />
            ) : null}
          </div>

          <div style={{ fontSize: 12, color: COLOR.hint, marginTop: 4, lineHeight: 1.8 }}>
            {u.email}
            {u.studentId ? ` · ${u.studentId}` : ''}
            {u.faculty ? ` · ${u.faculty}` : ''}
          </div>

          <div style={{ fontSize: 11.5, color: COLOR.hint, marginTop: 2, lineHeight: 1.8 }}>
            {`${t('สมัครเมื่อ')} ${isEn ? u.joinedEn : u.joinedTh}`}
            {u.registrations > 0 ? ` · ${t('ลงทะเบียน')} ${u.registrations}` : ''}
            {u.organized > 0 ? ` · ${t('จัดกิจกรรม')} ${u.organized}` : ''}
          </div>
        </div>
      </div>

      {/* เหตุผลที่ผู้ใช้เขียนไว้ตอนขอลบบัญชี — แอดมินต้องอ่านก่อนตัดสินใจ */}
      {u.deletionRequested && u.deletionReason ? (
        <div
          style={{
            padding: '10px 13px',
            borderRadius: 12,
            background: 'rgba(245,166,35,.12)',
            color: '#A66112',
            fontSize: 12,
            lineHeight: 1.8,
          }}
        >
          {`${t('เหตุผล')}: ${u.deletionReason}`}
        </div>
      ) : null}

      {/* ── การกระทำ ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          paddingTop: 11,
          borderTop: '1px solid rgba(31,41,55,.08)',
        }}
      >
        {locked ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLOR.hint }}>
            <Icon name="lock" size={15} />
            {t('นี่คือบัญชีของคุณเอง')}
          </span>
        ) : (
          <>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: COLOR.label }}>
              {t('บทบาท')}
              <select
                value={u.role}
                disabled={busy}
                onChange={(e) => onPatch({ role: e.target.value })}
                aria-label={`${t('บทบาทของ')} ${u.name || u.email}`}
                style={{ ...inputStyle(false), width: 'auto', padding: '7px 11px', fontSize: 12.5 }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {isEn ? ROLE_LABEL_EN[r] : ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>

            <Button
              variant="secondary"
              icon={u.active ? 'block' : 'lock_open'}
              disabled={busy}
              onClick={() => onPatch({ active: !u.active })}
              style={{ padding: '8px 14px', fontSize: 12.5, marginInlineStart: 'auto' }}
            >
              {u.active ? t('ระงับบัญชี') : t('คืนสิทธิ์')}
            </Button>

            {u.deletionRequested ? (
              <Button
                variant="secondary"
                icon="undo"
                disabled={busy}
                onClick={() => onPatch({ clearDeletion: true })}
                style={{ padding: '8px 14px', fontSize: 12.5 }}
              >
                {t('ปิดคำขอลบ')}
              </Button>
            ) : null}

            {/* ลบถาวร — แยกสีออกจากปุ่มอื่นให้ชัดว่าไม่ใช่การกระทำที่ย้อนกลับได้ */}
            <Button
              variant="secondary"
              icon="delete_forever"
              disabled={busy}
              onClick={onAskDelete}
              style={{
                padding: '8px 14px',
                fontSize: 12.5,
                color: SEMANTIC.danger.color,
                background: SEMANTIC.danger.bg,
              }}
            >
              {t('ลบบัญชี')}
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
