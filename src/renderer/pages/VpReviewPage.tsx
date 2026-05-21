import { ClipboardList, Pencil, Search, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { platformLabels, platformOptions } from "../../shared/platforms";
import type { Platform, VpContest, VpReview } from "../../shared/types";

type Filters = {
  keyword: string;
  tag: string;
  platform: "" | Platform;
  monthKey: string;
};

type FormState = {
  id: string | null;
  vpContestId: string;
  title: string;
  body: string;
  resultTagsText: string;
  tagsText: string;
};

const emptyForm: FormState = {
  id: null,
  vpContestId: "",
  title: "",
  body: "",
  resultTagsText: "",
  tagsText: ""
};

function splitTags(value: string): string[] {
  return value
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function joinTags(tags: string[]): string {
  return tags.join(", ");
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function formFromReview(review: VpReview): FormState {
  return {
    id: review.id,
    vpContestId: review.vpContestId,
    title: review.title,
    body: review.body,
    resultTagsText: joinTags(review.resultTags),
    tagsText: joinTags(review.tags)
  };
}

export function VpReviewPage() {
  const [filters, setFilters] = useState<Filters>({ keyword: "", tag: "", platform: "", monthKey: "" });
  const [reviews, setReviews] = useState<VpReview[]>([]);
  const [contests, setContests] = useState<VpContest[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const contestById = useMemo(() => new Map(contests.map((contest) => [contest.id, contest])), [contests]);
  const apiFilters = useMemo(
    () => ({
      keyword: filters.keyword.trim() || undefined,
      tag: filters.tag.trim() || undefined,
      platform: filters.platform || undefined,
      monthKey: filters.monthKey || undefined
    }),
    [filters]
  );

  async function loadData() {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const [nextReviews, nextContests] = await Promise.all([api.listReviews(apiFilters), api.listVpContests()]);
      setReviews(nextReviews);
      setContests(nextContests);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [apiFilters]);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.vpContestId || !form.title.trim()) {
      setStatusMessage("请选择 VP 并填写标题");
      return;
    }

    const payload = {
      vpContestId: form.vpContestId,
      title: form.title.trim(),
      body: form.body,
      resultTags: splitTags(form.resultTagsText),
      tags: splitTags(form.tagsText)
    };

    setIsLoading(true);
    setStatusMessage(null);

    try {
      if (form.id) {
        await api.updateReview(form.id, payload);
      } else {
        await api.createReview(payload);
      }

      setForm(emptyForm);
      await loadData();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteReview(review: VpReview) {
    if (!window.confirm(`删除 ${review.title}？`)) {
      return;
    }

    setIsLoading(true);

    try {
      await api.deleteReview(review.id);
      await loadData();
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
          <p className="eyebrow">Review Notes</p>
          <h1 id="page-title">复盘</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => setForm(emptyForm)}>
          <ClipboardList size={17} />
          新建复盘
        </button>
      </header>

      <section className="toolbar-panel review-toolbar" aria-label="复盘筛选">
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
        <label className="field compact-field">
          <span>标签</span>
          <input value={filters.tag} onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))} />
        </label>
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
      </section>

      {statusMessage ? <p className="status-line">{statusMessage}</p> : null}

      <div className="management-grid">
        <section className="panel" aria-labelledby="review-list-title">
          <div className="panel-heading">
            <h2 id="review-list-title">复盘列表</h2>
            <span>{reviews.length}</span>
          </div>
          <div className="table-list">
            {reviews.length ? (
              reviews.map((review) => {
                const contest = contestById.get(review.vpContestId);

                return (
                  <article className="review-row" key={review.id}>
                    <div className="row-main">
                      <strong>{review.title}</strong>
                      <span>
                        {contest?.title ?? "未关联 VP"} · {formatDateTime(review.updatedAtIso)}
                      </span>
                      <div className="tag-list">
                        {[...review.resultTags, ...review.tags].map((tag) => (
                          <span className="tag-chip" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="icon-button" type="button" aria-label="编辑" onClick={() => setForm(formFromReview(review))}>
                      <Pencil size={17} />
                    </button>
                    <button className="icon-button danger-button" type="button" aria-label="删除" onClick={() => void deleteReview(review)}>
                      <Trash2 size={17} />
                    </button>
                  </article>
                );
              })
            ) : (
              <p className="empty-line">{isLoading ? "加载中" : "暂无复盘"}</p>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="review-form-title">
          <div className="panel-heading">
            <h2 id="review-form-title">{form.id ? "编辑复盘" : "新增复盘"}</h2>
          </div>
          <form className="form-stack" onSubmit={(event) => void submitForm(event)}>
            <label className="field">
              <span>关联 VP</span>
              <select value={form.vpContestId} onChange={(event) => updateForm({ vpContestId: event.target.value })}>
                <option value="">选择 VP</option>
                {contests.map((contest) => (
                  <option value={contest.id} key={contest.id}>
                    {contest.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>标题</span>
              <input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} />
            </label>
            <label className="field">
              <span>正文</span>
              <textarea className="large-textarea" value={form.body} onChange={(event) => updateForm({ body: event.target.value })} />
            </label>
            <label className="field">
              <span>成绩标签</span>
              <input value={form.resultTagsText} onChange={(event) => updateForm({ resultTagsText: event.target.value })} />
            </label>
            <label className="field">
              <span>自由标签</span>
              <input value={form.tagsText} onChange={(event) => updateForm({ tagsText: event.target.value })} />
            </label>
            <button className="primary-button full-button" type="submit" disabled={isLoading}>
              保存
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
