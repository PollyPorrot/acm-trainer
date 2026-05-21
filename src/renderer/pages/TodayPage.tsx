import { Bell, CalendarDays, Clock3, Image as ImageIcon, RefreshCw, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { ReminderModal } from "../components/ReminderModal";
import type { ContestReminder, ImageWallItem, VpContest } from "../../shared/types";

type TodayState = {
  contests: ContestReminder[];
  vpContests: VpContest[];
  images: ImageWallItem[];
  isLoading: boolean;
  error: string | null;
};

const initialState: TodayState = {
  contests: [],
  vpContests: [],
  images: [],
  isLoading: true,
  error: null
};

function formatDate(isoOrDate: string | Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "full"
  }).format(new Date(isoOrDate));
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function dateSeed(value: string): number {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
}

function pickDailyImage(images: ImageWallItem[]): ImageWallItem | undefined {
  if (!images.length) {
    return undefined;
  }

  const localDateKey = new Date().toLocaleDateString("en-CA");
  return images[dateSeed(localDateKey) % images.length];
}

function latestFetchedAt(contests: ContestReminder[]): string | null {
  return contests
    .map((contest) => contest.fetchedAtIso)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function sortUpcomingVp(contests: VpContest[]): VpContest[] {
  const now = Date.now();

  return contests
    .filter((contest) => new Date(contest.scheduledAtIso).getTime() >= now)
    .sort((left, right) => left.scheduledAtIso.localeCompare(right.scheduledAtIso))
    .slice(0, 5);
}

export function TodayPage() {
  const [state, setState] = useState<TodayState>(initialState);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  async function loadTodayData() {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const [contests, vpContests, images] = await Promise.all([
        api.listTodayContests(),
        api.listVpContests(),
        api.listImages({ allowRandomReminder: true })
      ]);

      setState({
        contests,
        vpContests,
        images,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setState({
        contests: [],
        vpContests: [],
        images: [],
        isLoading: false,
        error: error instanceof Error ? error.message : "加载失败"
      });
    }
  }

  async function refreshContests() {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      await api.refreshContests();
      await loadTodayData();
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: error instanceof Error ? error.message : "刷新失败"
      }));
    }
  }

  useEffect(() => {
    void loadTodayData();
  }, []);

  const upcomingVp = useMemo(() => sortUpcomingVp(state.vpContests), [state.vpContests]);
  const dailyImage = useMemo(() => pickDailyImage(state.images), [state.images]);
  const fetchedAt = latestFetchedAt(state.contests);

  return (
    <div className="today-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{formatDate(new Date())}</p>
          <h1 id="page-title">ACM Trainer</h1>
        </div>
        <div className="header-actions">
          <button className="icon-button" type="button" aria-label="刷新比赛" onClick={refreshContests}>
            <RefreshCw size={18} />
          </button>
          <button className="primary-button" type="button" onClick={() => setIsReminderOpen(true)}>
            <Bell size={17} />
            今日提醒
          </button>
        </div>
      </header>

      <section className="metric-grid" aria-label="今日概览">
        <article className="metric-card">
          <Bell size={18} />
          <span>今日比赛</span>
          <strong>{state.contests.length}</strong>
        </article>
        <article className="metric-card">
          <CalendarDays size={18} />
          <span>近期 VP</span>
          <strong>{upcomingVp.length}</strong>
        </article>
        <article className="metric-card">
          <ImageIcon size={18} />
          <span>提醒图片</span>
          <strong>{state.images.length}</strong>
        </article>
        <article className="metric-card">
          <Clock3 size={18} />
          <span>缓存更新</span>
          <strong>{fetchedAt ? formatDateTime(fetchedAt) : "—"}</strong>
        </article>
      </section>

      {state.error ? <p className="status-line">{state.error}</p> : null}
      {state.isLoading ? <p className="status-line">加载中</p> : null}

      <div className="dashboard-grid">
        <section className="panel" aria-labelledby="today-contests-title">
          <div className="panel-heading">
            <h2 id="today-contests-title">今日比赛</h2>
            <span>{state.contests.length}</span>
          </div>
          <div className="item-list">
            {state.contests.length ? (
              state.contests.map((contest) => (
                <article className="list-item" key={contest.id}>
                  <div>
                    <strong>{contest.title}</strong>
                    <span>{contest.platform}</span>
                  </div>
                  <time>{formatDateTime(contest.startTimeIso)}</time>
                </article>
              ))
            ) : (
              <p className="empty-line">今日暂无比赛</p>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="vp-title">
          <div className="panel-heading">
            <h2 id="vp-title">近期 VP</h2>
            <Trophy size={18} />
          </div>
          <div className="item-list">
            {upcomingVp.length ? (
              upcomingVp.map((contest) => (
                <article className="list-item" key={contest.id}>
                  <div>
                    <strong>{contest.title}</strong>
                    <span>{contest.platform}</span>
                  </div>
                  <time>{formatDateTime(contest.scheduledAtIso)}</time>
                </article>
              ))
            ) : (
              <p className="empty-line">暂无近期 VP</p>
            )}
          </div>
        </section>

        <section className="panel image-panel" aria-labelledby="image-title">
          <div className="panel-heading">
            <h2 id="image-title">今日图片</h2>
            <ImageIcon size={18} />
          </div>
          {dailyImage ? (
            <article className="image-summary">
              <strong>{dailyImage.title}</strong>
              <span>{dailyImage.tags.join(" · ") || dailyImage.originalFileName}</span>
            </article>
          ) : (
            <p className="empty-line">暂无图片</p>
          )}
        </section>
      </div>

      {isReminderOpen ? (
        <ReminderModal contests={state.contests} image={dailyImage} onClose={() => setIsReminderOpen(false)} />
      ) : null}
    </div>
  );
}
