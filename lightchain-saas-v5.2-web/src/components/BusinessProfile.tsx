import { useMemo, useState } from "react";
import { FigmaIcon } from "./FigmaIcon";
import { assetUrl } from "../utils/assets";

type Profile = {
  name: string;
  summary: string;
  updated: string;
};

const profileArt = (name: string) => assetUrl(`assets/business-profile/${name}`);

export function BusinessProfile() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [draftName, setDraftName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filteredProfiles = useMemo(
    () => profiles.filter((profile) => profile.name.toLowerCase().includes(query.toLowerCase())),
    [profiles, query],
  );

  const createProfile = () => {
    const name = draftName.trim();
    if (!name) return;
    setProfiles((current) => [
      ...current,
      { name, summary: "尚未填写偏好信息", updated: "刚刚创建" },
    ]);
    setDraftName("");
    setCreateOpen(false);
  };

  return (
    <main className="profile-region">
      <div className="profile-shell" data-node-id="146:11417">
        <section className="profile-top" aria-labelledby="profile-title">
          <div className="profile-heading-art" aria-hidden="true">
            <img className="profile-heading-art__card" src={profileArt("header-card.svg")} alt="" />
            <img className="profile-heading-art__arc" src={profileArt("header-arc.svg")} alt="" />
            <img className="profile-heading-art__archive" src={profileArt("header-archive.svg")} alt="" />
            <img className="profile-heading-art__spark" src={profileArt("header-spark.svg")} alt="" />
          </div>

          <div className="profile-heading">
            <div>
              <h1 id="profile-title">业务偏好档案</h1>
              <p>保存长期稳定的市场、品类、风格和经营边界，供任务自动应用。</p>
            </div>
            <button className="profile-create-button" type="button" onClick={() => setCreateOpen(true)}>
              <FigmaIcon name="plus" size={20} />
              <span>新建档案</span>
            </button>
          </div>

          <label className="profile-search">
            <FigmaIcon name="search" size={20} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入档案名称搜索"
              aria-label="输入档案名称搜索"
            />
            <button type="button" onClick={() => setQuery((value) => value.trim())}>
              搜索
            </button>
          </label>
        </section>

        <section className="profile-content" aria-live="polite">
          {filteredProfiles.length === 0 ? (
            <div className="profile-empty-card">
              <div className="profile-empty-art" aria-hidden="true">
                <div className="profile-empty-art__back" />
                <img className="profile-empty-art__ellipse-a" src={profileArt("empty-ellipse-a.svg")} alt="" />
                <img className="profile-empty-art__ellipse-b" src={profileArt("empty-ellipse-b.svg")} alt="" />
                <div className="profile-empty-art__lens">
                  <img src={profileArt("empty-magnifier.png")} alt="" />
                  <img className="profile-empty-art__circle" src={profileArt("empty-circle.svg")} alt="" />
                  <img className="profile-empty-art__vector" src={profileArt("empty-vector.svg")} alt="" />
                  <img className="profile-empty-art__star-a" src={profileArt("empty-star-a.svg")} alt="" />
                  <img className="profile-empty-art__star-b" src={profileArt("empty-star-b.svg")} alt="" />
                </div>
              </div>
              <div className="profile-empty-copy">
                <strong>{query ? "没有匹配的档案" : "还没有业务偏好档案"}</strong>
                <span>
                  {query
                    ? "试试其他名称，或创建一个新的档案"
                    : "保存品类、价格段、国家和目标年龄，后续任务无需重复输入"}
                </span>
              </div>
              {!query && (
                <button className="profile-empty-action" type="button" onClick={() => setCreateOpen(true)}>
                  创建第一个档案
                </button>
              )}
            </div>
          ) : (
            <div className="profile-list">
              {filteredProfiles.map((profile) => (
                <button className="profile-card" type="button" key={profile.name}>
                  <span className="profile-card__title">{profile.name}</span>
                  <span className="profile-card__summary">{profile.summary}</span>
                  <span className="profile-card__updated">{profile.updated}</span>
                  <FigmaIcon name="chevron-right" size={20} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {createOpen && (
        <div className="profile-modal-backdrop" role="presentation" onMouseDown={() => setCreateOpen(false)}>
          <form
            className="profile-modal"
            onSubmit={(event) => {
              event.preventDefault();
              createProfile();
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="profile-modal__header">
              <div>
                <h2>新建业务偏好档案</h2>
                <p>先给档案起个名字，之后可以继续补充偏好信息。</p>
              </div>
              <button type="button" aria-label="关闭" onClick={() => setCreateOpen(false)}>
                <FigmaIcon name="close" size={20} />
              </button>
            </div>
            <label className="profile-modal__field">
              <span>档案名称</span>
              <input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="例如：女装品牌春夏偏好"
              />
            </label>
            <div className="profile-modal__actions">
              <button type="button" onClick={() => setCreateOpen(false)}>取消</button>
              <button className="profile-create-button" type="submit" disabled={!draftName.trim()}>创建档案</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
