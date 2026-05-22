import { LogOut, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import type { AppSettings } from "../../shared/types";

type SettingsState = {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: SettingsState = {
  settings: null,
  isLoading: true,
  error: null
};

export function SettingsPage() {
  const [state, setState] = useState<SettingsState>(initialState);

  async function loadSettings() {
    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      setState({
        settings: await api.getSettings(),
        isLoading: false,
        error: null
      });
    } catch (error) {
      setState({
        settings: null,
        isLoading: false,
        error: error instanceof Error ? error.message : "加载失败"
      });
    }
  }

  async function updateSetting(patch: Partial<AppSettings>) {
    if (!state.settings) {
      return;
    }

    const optimistic = { ...state.settings, ...patch };
    setState((current) => ({ ...current, settings: optimistic, error: null }));

    try {
      setState({
        settings: await api.updateSettings(patch),
        isLoading: false,
        error: null
      });
    } catch (error) {
      setState({
        settings: state.settings,
        isLoading: false,
        error: error instanceof Error ? error.message : "保存失败"
      });
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  const settings = state.settings;

  return (
    <div className="management-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>设置</h1>
        </div>
        <button className="icon-button" type="button" aria-label="重新加载设置" onClick={loadSettings}>
          <RefreshCw size={18} />
        </button>
      </header>

      {state.error ? <p className="status-line">{state.error}</p> : null}
      {state.isLoading ? <p className="status-line">加载中...</p> : null}

      {settings ? (
        <div className="settings-grid">
          <section className="panel" aria-labelledby="settings-reminders">
            <div className="panel-heading">
              <h2 id="settings-reminders">提醒</h2>
            </div>
            <div className="settings-list">
              <label className="setting-row">
                <input
                  type="checkbox"
                  checked={settings.contestRemindersEnabled}
                  onChange={(event) => void updateSetting({ contestRemindersEnabled: event.target.checked })}
                />
                <span>
                  <strong>今日比赛提醒</strong>
                  <small>启动和解锁时自动检查 Codeforces、AtCoder、牛客缓存</small>
                </span>
              </label>
              <label className="setting-row">
                <input
                  type="checkbox"
                  checked={settings.imageRandomReminderEnabled}
                  onChange={(event) => void updateSetting({ imageRandomReminderEnabled: event.target.checked })}
                />
                <span>
                  <strong>随机图片提醒</strong>
                  <small>今日提醒里抽一张允许提醒的图片</small>
                </span>
              </label>
            </div>
          </section>

          <section className="panel" aria-labelledby="settings-app">
            <div className="panel-heading">
              <h2 id="settings-app">应用</h2>
            </div>
            <div className="settings-list">
              <label className="setting-row">
                <input
                  type="checkbox"
                  checked={settings.launchAtStartup}
                  onChange={(event) => void updateSetting({ launchAtStartup: event.target.checked })}
                />
                <span>
                  <strong>开机自启</strong>
                  <small>登录 Windows 后自动启动 ACM Trainer</small>
                </span>
              </label>
              <label className="setting-row">
                <input
                  type="checkbox"
                  checked={settings.minimizeToTray}
                  onChange={(event) => void updateSetting({ minimizeToTray: event.target.checked })}
                />
                <span>
                  <strong>关闭主窗口时留在后台</strong>
                  <small>从托盘菜单可以重新打开或退出</small>
                </span>
              </label>
              <div className="setting-row data-row">
                <span>
                  <strong>本地数据目录</strong>
                  <small>{settings.dataDirectory || "未读取到目录"}</small>
                </span>
              </div>
              <button
                className="primary-button danger-button full-button"
                type="button"
                onClick={() => {
                  void api.quitApp();
                }}
              >
                <LogOut size={17} />
                退出后台应用
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
