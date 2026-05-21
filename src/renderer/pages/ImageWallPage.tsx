import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type { ImageWallItem } from "../../shared/types";

type ImageForm = {
  id: string | null;
  title: string;
  tagsText: string;
  allowRandomReminder: boolean;
};

const emptyForm: ImageForm = {
  id: null,
  title: "",
  tagsText: "",
  allowRandomReminder: true
};

function splitTags(value: string): string[] {
  return value
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formFromImage(image: ImageWallItem): ImageForm {
  return {
    id: image.id,
    title: image.title,
    tagsText: image.tags.join(", "),
    allowRandomReminder: image.allowRandomReminder
  };
}

export function ImageWallPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<ImageWallItem[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [tagFilter, setTagFilter] = useState("");
  const [form, setForm] = useState<ImageForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const visibleImages = useMemo(() => {
    const tag = tagFilter.trim().toLocaleLowerCase();
    return tag ? images.filter((image) => image.tags.some((item) => item.toLocaleLowerCase() === tag)) : images;
  }, [images, tagFilter]);

  async function loadImages() {
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const nextImages = await api.listImages();
      setImages(nextImages);

      const entries = await Promise.all(
        nextImages.map(async (image) => [image.id, await api.getImageDataUrl(image.id).catch(() => "")] as const)
      );
      setThumbs(Object.fromEntries(entries));
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function importFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);

    if (!fileArray.length) {
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const paths = fileArray.map((file) => api.getPathForFile(file)).filter(Boolean);
      await api.importImagePaths(paths);
      await loadImages();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "导入失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveImageForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.id) {
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      await api.updateImage(form.id, {
        title: form.title.trim() || "Image",
        tags: splitTags(form.tagsText),
        allowRandomReminder: form.allowRandomReminder
      });
      setForm(emptyForm);
      await loadImages();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteImage(image: ImageWallItem) {
    if (!window.confirm(`删除 ${image.title}？`)) {
      return;
    }

    setIsLoading(true);

    try {
      await api.deleteImage(image.id);
      if (form.id === image.id) {
        setForm(emptyForm);
      }
      await loadImages();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "删除失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadImages();
  }, []);

  return (
    <div className="management-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Image Wall</p>
          <h1 id="page-title">图片墙</h1>
        </div>
        <div className="header-actions">
          <button className="icon-button" type="button" aria-label="刷新图片" onClick={() => void loadImages()}>
            <RefreshCw size={18} />
          </button>
          <button className="primary-button" type="button" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={17} />
            导入
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept="image/*"
        multiple
        onChange={(event) => {
          if (event.target.files) {
            void importFiles(event.target.files);
          }
          event.currentTarget.value = "";
        }}
      />

      <section
        className="drop-zone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void importFiles(event.dataTransfer.files);
        }}
      >
        <span>拖入图片</span>
      </section>

      <section className="toolbar-panel image-toolbar" aria-label="图片筛选">
        <label className="field compact-field">
          <span>标签</span>
          <input value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} />
        </label>
      </section>

      {statusMessage ? <p className="status-line">{statusMessage}</p> : null}

      <div className="management-grid">
        <section className="panel" aria-labelledby="image-list-title">
          <div className="panel-heading">
            <h2 id="image-list-title">图片列表</h2>
            <span>{visibleImages.length}</span>
          </div>
          <div className="image-grid">
            {visibleImages.length ? (
              visibleImages.map((image) => (
                <article className="image-tile" key={image.id} onClick={() => setForm(formFromImage(image))}>
                  {thumbs[image.id] ? <img src={thumbs[image.id]} alt={image.title} /> : <div className="image-placeholder" />}
                  <div>
                    <strong>{image.title}</strong>
                    <span>{image.tags.join(" · ") || image.originalFileName}</span>
                  </div>
                  <button
                    className="icon-button danger-button"
                    type="button"
                    aria-label="删除图片"
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteImage(image);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ))
            ) : (
              <p className="empty-line">{isLoading ? "加载中" : "暂无图片"}</p>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="image-form-title">
          <div className="panel-heading">
            <h2 id="image-form-title">图片信息</h2>
          </div>
          <form className="form-stack" onSubmit={(event) => void saveImageForm(event)}>
            <label className="field">
              <span>标题</span>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field">
              <span>标签</span>
              <input value={form.tagsText} onChange={(event) => setForm((current) => ({ ...current, tagsText: event.target.value }))} />
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={form.allowRandomReminder}
                onChange={(event) => setForm((current) => ({ ...current, allowRandomReminder: event.target.checked }))}
              />
              <span>参与随机提醒</span>
            </label>
            <button className="primary-button full-button" type="submit" disabled={!form.id || isLoading}>
              保存
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
