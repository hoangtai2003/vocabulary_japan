import { isMockMode } from '@/api/env';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataSection } from '@/components/profile/DataSection';
import { DisplayNameForm } from '@/components/profile/DisplayNameForm';
import { MockTools } from '@/components/profile/MockTools';
import { PasswordForm } from '@/components/profile/PasswordForm';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { StudySettingsForm } from '@/components/profile/StudySettingsForm';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const joinedFormat = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' });

/**
 * Hồ sơ: tên hiển thị, cài đặt học, mật khẩu, xuất/xóa dữ liệu.
 * Dữ liệu là người dùng hiện tại, đã tải xong trước khi vào trang (ProtectedRoute), nên trang
 * không có trạng thái tải/lỗi riêng; mỗi thao tác tự báo lỗi tại chỗ.
 */
export default function ProfilePage() {
  useDocumentTitle('Hồ sơ');
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Hồ sơ"
        description={
          <>
            <span className="break-all">{user.email}</span>
            <span aria-hidden="true"> · </span>
            Tham gia từ {joinedFormat.format(new Date(user.created_at))}
          </>
        }
      />
      <div className="flex flex-col gap-5">
        <ProfileSection title="Tên hiển thị">
          <DisplayNameForm key={user.display_name} displayName={user.display_name} />
        </ProfileSection>
        <ProfileSection title="Cài đặt học" description="Lưu ngay khi bạn chọn.">
          <StudySettingsForm settings={user.settings} />
        </ProfileSection>
        <ProfileSection title="Đổi mật khẩu">
          <PasswordForm />
        </ProfileSection>
        <ProfileSection title="Dữ liệu của bạn">
          <DataSection />
        </ProfileSection>
        {isMockMode && <MockTools />}
      </div>
    </div>
  );
}
