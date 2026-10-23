import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChartCard } from '@/components/progress/ChartCard';
import { ExamStatsSection } from '@/components/progress/ExamStatsSection';
import { StatGrid } from '@/components/progress/StatGrid';
import { StudyHeatmap } from '@/components/progress/StudyHeatmap';
import { WeeklyChart } from '@/components/progress/WeeklyChart';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useCalendarStats, useStatsOverview, useWeeklyStats } from '@/hooks/queries/useStats';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { heatmapRange } from '@/utils/heatmap';

function ChartSkeleton({ title, height }: { title: string; height: string }) {
  return (
    <ChartCard title={title}>
      <SkeletonGroup label={`Đang tải ${title.toLowerCase()}`}>
        <Skeleton className={`w-full ${height}`} />
      </SkeletonGroup>
    </ChartCard>
  );
}

export default function ProgressPage() {
  useDocumentTitle('Tiến độ');
  // Chốt "hôm nay" một lần cho cả trang để khoảng ngày của heatmap không đổi giữa các lần render.
  const today = useMemo(() => new Date(), []);
  const range = useMemo(() => heatmapRange(today), [today]);
  const overview = useStatsOverview();
  const weekly = useWeeklyStats(8);
  const calendar = useCalendarStats(range.from, range.to);

  const neverStudied =
    overview.data?.total_learned === 0 &&
    calendar.data?.days.length === 0 &&
    weekly.data?.weeks.every((w) => w.new_learned + w.reviewed === 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tiến độ" description="Chuỗi ngày học, số từ đã học và nhịp ôn của bạn." />

      {overview.isError ? (
        <ErrorState
          title="Chưa tải được các chỉ số"
          onRetry={() => void overview.refetch()}
          retrying={overview.isRefetching}
        />
      ) : (
        <StatGrid stats={overview.data} />
      )}

      {neverStudied ? (
        <EmptyState
          mark="始"
          title="Chưa có gì để vẽ"
          description="Học vài từ đầu tiên, biểu đồ và lịch học sẽ bắt đầu từ hôm nay."
          action={
            <Link to="/hoc" className={buttonClasses()}>
              Bắt đầu học
            </Link>
          }
        />
      ) : (
        <>
          {weekly.isPending ? (
            <ChartSkeleton title="8 tuần gần nhất" height="h-60" />
          ) : weekly.isError ? (
            <ErrorState
              title="Chưa tải được biểu đồ tuần"
              onRetry={() => void weekly.refetch()}
              retrying={weekly.isRefetching}
            />
          ) : (
            <WeeklyChart weeks={weekly.data.weeks} />
          )}

          {calendar.isPending ? (
            <ChartSkeleton title="Lịch học 6 tháng" height="h-40" />
          ) : calendar.isError ? (
            <ErrorState
              title="Chưa tải được lịch học"
              onRetry={() => void calendar.refetch()}
              retrying={calendar.isRefetching}
            />
          ) : (
            <StudyHeatmap days={calendar.data.days} today={today} />
          )}
        </>
      )}

      <ExamStatsSection />
    </div>
  );
}
