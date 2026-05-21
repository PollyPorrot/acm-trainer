import { ExternalLink, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { formatLocalDateTimeInput, parseLocalDateTimeInput } from "../../shared/date";
import { detectPlatformFromUrl, platformLabels, platformOptions } from "../../shared/platforms";
import type { Platform, VpContest, VpContestStatus } from "../../shared/types";

type Filters = {
  platform: "" | Platform;
  monthKey: string;
  keyword: string;
};

type FormState = {
  id: string | null;
  url: string;
  platform: Platform;
  title: string;
  scheduledAtInput: string;
  status: VpContestStatus;
  notes: string;
};

const statusLabels: Record<VpContestStatus, string> = {
  planned: "计划",
  completed: "完成",
  skipped: "跳过"
};

const emptyForm: FormState = {
  id: null,
  url: "",
  platform: "unknown",
  title: "",
  scheduledAtInput: "",
  status: "planned",
  notes: ""
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function formFromContest(contest: VpContest): FormState {
  return {
    id: contest.id,
    url: contest.url,
    platform: contest.platform,
    title: contest.title,
    scheduledAtInput: formatLocalDateTimeInput(contest.scheduledAtIso),
    status: contest.status,
    notes: contest.notes
  };
}

export function VpContestPage() {
  const [filters, setFilters] = useState<Filters>({ platform: "", monthKey: "", keyword: "" });
  const [contests, setContests] = useState<VpContest[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const apiFilters = useMemo(
    () => ({
      platform: filters.platform || undefined,
      monthKey: filters.monthKey || undefined,
      keyword: filters.keyword.trim() || undefined
    }),
    [filters]
  );

  async function loadContests() {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      setContests(await api.listVpContests(apiFilters));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadContests();
  }, [apiFilters]);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function recognizeLink() {
    if (!form.url.trim()) {
      return;
    }

    const requestUrl = form.url;
    const requestTitle = form.title;
    setIsRecognizing(true);
    setStatusMessage(null);

    try {
      const detectedPlatform = detectPlatformFromUrl(requestUrl);
      const result = await api.recognizeVpContestLink(requestUrl);

      setForm((current) => {
        if (current.url !== requestUrl) {
          return current;
        }

        const userEditedTitle = current.title !== requestTitle;

        return {
          ...current,
          platform: result.platform === "unknown" ? detectedPlatform : result.platform,
          title: userEditedTitle ? current.title : result.title || current.title
        };
      });
    } catch {
      setForm((current) => (current.url === requestUrl ? { ...current, platform: detectPlatformFromUrl(requestUrl) } : current));
    } finally {
      setIsRecognizing(false);
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scheduledAtIso = parseLocalDateTimeInput(form.scheduledAtInput);

    if (!scheduledAtIso) {
      setStatusMessage("请选择有效的 VP 时间");
      return;
    }

    const payload = {
      platform: form.platform,
      title: form.title.trim(),
      url: form.url.trim(),
      scheduledAtIso,
      notes: form.notes,
      status: form.status
    };

    if (!payload.title || !payload.url) {
      setStatusMessage("链接和名称不能为空");
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      if (form.id) {
        await api.updateVpContest(form.id, payload);
      } else {
        await api.createVpContest(payload);
      }

      setForm(emptyForm);
      await loadContests();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteContest(contest: VpContest) {
    if (!window.confirm(`删除 ${contest.title}？`)) {
      return;
    }

    setIsLoading(true);

    try {
      await api.deleteVpContest(contest.id);
      await loadContests();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "删除失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="management-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">VP Library</p>
          <h1 id="page-title">VP 比赛</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setForm(emptyForm)}>
          <Plus size={17} />
          新建
        </button>
      </header>

      <section className="toolbar-panel" aria-label="VP 筛选">
        <label className="field compact-field">
          <span>平台</span>
          <select
            value={filters.platform}
            onChange={(event) => setFilters((current) => ({ ...current, platform: event.target.value as Filters["platform"] }))}
          >
            <option value="">全部</option>
            {platformOptions.map((platform) => (
              <option value={platform} key={platform}>
                {platformLabels[platform]}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact-field">
          <span>年月</span>
          <input
            type="month"
            value={filters.monthKey}
            onChange={(event) => setFilters((current) => ({ ...current, monthKey: event.target.value }))}
          />
        </label>
        <label className="field search-field">
          <span>关键词</span>
          <div className="input-with-icon">
            <Search size={16} />
            <input
              type="search"
              value={filters.keyword}
              onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
            />
          </div>
        </label>
      </section>

      {statusMessage ? <p className="status-line">{statusMessage}</p> : null}

      <div className="management-grid">
        <section className="panel" aria-labelledby="vp-list-title">
          <div className="panel-heading">
            <h2 id="vp-list-title">比赛列表</h2>
            <span>{contests.length}</span>
          </div>
          <div className="table-list">
            {contests.length ? (
              contests.map((contest) => (
                <article className="table-row" key={contest.id}>
                  <div className="row-main">
                    <strong>{contest.title}</strong>
                    <span>
                      {platformLabels[contest.platform]} · {formatDateTime(contest.scheduledAtIso)}
                    </span>
                  </div>
                  <span className="status-pill">{statusLabels[contest.status]}</span>
                  <a className="icon-button" href={contest.url} target="_blank" rel="noreferrer" aria-label="打开链接">
                    <ExternalLink size={17} />
                  </a>
                  <button className="icon-button" type="button" aria-label="编辑" onClick={() => setForm(formFromContest(contest))}>
                    <Pencil size={17} />
                  </button>
                  <button className="icon-button danger-button" type="button" aria-label="删除" onClick={() => void deleteContest(contest)}>
                    <Trash2 size={17} />
                  </button>
                </article>
              ))
            ) : (
              <p className="empty-line">{isLoading ? "加载中" : "暂无 VP 比赛"}</p>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="vp-form-title">
          <div className="panel-heading">
            <h2 id="vp-form-title">{form.id ? "编辑 VP" : "新增 VP"}</h2>
          </div>
          <form className="form-stack" onSubmit={(event) => void submitForm(event)}>
            <label className="field">
              <span>链接</span>
              <div className="input-action-row">
                <input
                  value={form.url}
                  onChange={(event) => updateForm({ url: event.target.value })}
                  onBlur={() => void recognizeLink()}
                />
                <button className="icon-button" type="button" aria-label="识别链接" onClick={() => void recognizeLink()}>
                  <Sparkles size={17} />
                </button>
              </div>
            </label>
            <label className="field">
              <span>平台</span>
              <select value={form.platform} onChange={(event) => updateForm({ platform: event.target.value as Platform })}>
                {platformOptions.map((platform) => (
                  <option value={platform} key={platform}>
                    {platformLabels[platform]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>名称</span>
              <input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} />
            </label>
            <label className="field">
              <span>VP 时间</span>
              <input
                type="datetime-local"
                value={form.scheduledAtInput}
                onChange={(event) => updateForm({ scheduledAtInput: event.target.value })}
              />
            </label>
            <label className="field">
              <span>状态</span>
              <select value={form.status} onChange={(event) => updateForm({ status: event.target.value as VpContestStatus })}>
                {Object.entries(statusLabels).map(([status, label]) => (
                  <option value={status} key={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>备注</span>
              <textarea value={form.notes} onChange={(event) => updateForm({ notes: event.target.value })} />
            </label>
            <button className="primary-button full-button" type="submit" disabled={isLoading || isRecognizing}>
              {isRecognizing ? "识别中" : "保存"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
