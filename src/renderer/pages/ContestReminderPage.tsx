import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { platformLabels, platformOptions } from "../../shared/platforms";
import type { ContestReminder, Platform } from "../../shared/types";

type ContestPageState = {
  contests: ContestReminder[];
  failedProviders: Platform[];
  isLoading: boolean;
  error: string | null;
};

const initialState: ContestPageState = {
  contests: [],
  failedProviders: [],
  isLoading: true,
  error: null
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function latestFetchedAt(contests: ContestReminder[]): string | null {
  return contests
    .map((contest) => contest.fetchedAtIso)
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0] ?? null;
}

function groupByPlatform(contests: ContestReminder[]): Map<Platform, ContestReminder[]> {
  const groups = new Map<Platform, ContestReminder[]>();

  for (const contest of contests) {
    const platformContests = groups.get(contest.platform) ?? [];
    platformContests.push(contest);
    groups.set(contest.platform, platformContests);
  }

  return groups;
}

export function ContestReminderPage() {
  const [state, setState] = useState<ContestPageState>(initialState);

  async function loadContests() {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const contests = await api.listCachedContests();
      setState((current) => ({
        ...current,
        contests,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: error instanceof Error ? error.message : "加载失败"
      }));
    }
  }

  async function refreshContests() {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const result = await api.refreshContests();
      const contests = await api.listCachedContests();
      setState({
        contests,
        failedProviders: result.failedProviders,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: error instanceof Error ? error.message : "刷新失败"
      }));
    }
  }

  useEffect(() => {
    void loadContests();
  }, []);

  const groups = useMemo(() => groupByPlatform(state.contests), [state.contests]);
  const fetchedAt = latestFetchedAt(state.contests);

  return (
    <div className="management-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Contest Cache</p>
          <h1>比赛提醒</h1>
        </div>
        <button className="primary-button" type="button" onClick={refreshContests}>
          <RefreshCw size={17} />
          手动刷新
        </button>
      </header>

      <section className="metric-grid" aria-label="比赛提醒概览">
        <article className="metric-card">
          <span>缓存比赛</span>
          <strong>{state.contests.length}</strong>
        </article>
        <article className="metric-card">
          <span>平台数量</span>
          <strong>{groups.size}</strong>
        </article>
        <article className="metric-card">
          <span>刷新失败</span>
          <strong>{state.failedProviders.length}</strong>
        </article>
        <article className="metric-card">
          <span>最近更新</span>
          <strong>{fetchedAt ? formatDateTime(fetchedAt) : "--"}</strong>
        </article>
      </section>

      {state.error ? <p className="status-line">{state.error}</p> : null}
      {state.isLoading ? <p className="status-line">加载中...</p> : null}
      {state.failedProviders.length ? (
        <p className="status-line">
          这些平台刷新失败：
          {state.failedProviders.map((platform) => platformLabels[platform]).join("、")}
        </p>
      ) : null}

      <div className="contest-group-list">
        {platformOptions
          .filter((platform) => groups.has(platform))
          .map((platform) => (
            <section className="panel" key={platform} aria-labelledby={`contest-group-${platform}`}>
              <div className="panel-heading">
                <h2 id={`contest-group-${platform}`}>{platformLabels[platform]}</h2>
                <span>{groups.get(platform)?.length ?? 0}</span>
              </div>
              <div className="item-list">
                {groups.get(platform)?.map((contest) => (
                  <article className="list-item" key={`${contest.platform}-${contest.id}`}>
                    <div>
                      <strong>{contest.title}</strong>
                      <span>{formatDateTime(contest.startTimeIso)}</span>
                    </div>
                    <a className="icon-button link-button" href={contest.url} aria-label="打开比赛链接">
                      <ExternalLink size={17} />
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        {!state.isLoading && !state.contests.length ? <p className="empty-line">暂无缓存比赛</p> : null}
      </div>
    </div>
  );
}
