import { Bell, X } from "lucide-react";
import type { ContestReminder, ImageWallItem } from "../../shared/types";

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

export function ReminderModal({
  contests,
  image,
  onClose
}: {
  contests: ContestReminder[];
  image?: ImageWallItem;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="reminder-modal" role="dialog" aria-modal="true" aria-labelledby="reminder-title">
        <header className="modal-header">
          <div>
            <p className="eyebrow">Today</p>
            <h2 id="reminder-title">今日提醒</h2>
          </div>
          <button className="icon-button" type="button" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="reminder-list">
          {contests.length ? (
            contests.map((contest) => (
              <article className="reminder-row" key={contest.id}>
                <Bell size={16} />
                <div>
                  <strong>{contest.title}</strong>
                  <span>
                    {contest.platform} · {formatTime(contest.startTimeIso)}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <p className="empty-line">今日暂无自动比赛提醒</p>
          )}
        </div>

        {image ? (
          <article className="image-reminder">
            <span>今日图片</span>
            <strong>{image.title}</strong>
          </article>
        ) : null}
      </section>
    </div>
  );
}
