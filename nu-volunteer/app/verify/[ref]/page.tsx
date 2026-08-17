import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { VerifyPanel } from '@/components/certificate/VerifyPanel';
import { appBaseUrl, findCertificateByRef } from '@/lib/certificates';

type Params = { params: Promise<{ ref: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ref } = await params;
  return {
    title: `ตรวจสอบใบประกาศ ${decodeURIComponent(ref)} · NU Volunteer`,
    // ผลการตรวจสอบเป็นข้อมูลของบุคคล ไม่ควรถูกเก็บลงดัชนีเครื่องมือค้นหา
    robots: { index: false, follow: false },
  };
}

export default async function VerifyRefPage({ params }: Params) {
  const { ref } = await params;
  const searchedRef = decodeURIComponent(ref);
  const certificate = await findCertificateByRef(searchedRef);

  return (
    <Shell>
      <VerifyPanel certificate={certificate} searchedRef={searchedRef} verifyBase={appBaseUrl()} />
    </Shell>
  );
}
