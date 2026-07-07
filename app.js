(function () {
  /* 注入背景浮动光斑层 */
  const orbLayer = document.createElement("div");
  orbLayer.className = "orb-layer";
  document.body.prepend(orbLayer);

  // 核心修改：拉大稀有度颜色区分度（深的更深、浅的更浅）
const rarityMap = {
  legendary: {
    name: "传奇",
    rank: 4,
    color: "#C82000",
    glow: "rgba(200, 32, 0, 0.34)",
    fill: "linear-gradient(145deg, #fff0eb, #e03311 46%, #a01a00)"
  },
  epic: {
    name: "史诗",
    rank: 3,
    color: "#E85500",
    glow: "rgba(232, 85, 0, 0.26)",
    fill: "linear-gradient(145deg, #ffe8d6, #e85500 48%, #b84300)"
  },
  rare: {
    name: "稀有",
    rank: 2,
    color: "#FF914A",
    glow: "rgba(255, 145, 74, 0.20)",
    fill: "linear-gradient(145deg, #fff0e3, #ff914a 48%, #d47020)"
  },
  common: {
    name: "普通",
    rank: 1,
    color: "#C4C7CE",
    glow: "rgba(196, 199, 206, 0.15)",
    fill: "linear-gradient(145deg, #f2f3f5, #c4c7ce 48%, #9ea2aa)"
  }
};
const avatarTones = {
  cyan: ["#ff9a44", "#a04a00", "rgba(255,154,68,0.25)"],
  violet: ["#ffb97a", "#b06020", "rgba(255,185,122,0.22)"],
  amber: ["#ff6a00", "#703810", "rgba(255,106,0,0.28)"],
  green: ["#ffc999", "#996030", "rgba(255,201,153,0.2)"],
  blue: ["#ffd4a8", "#8a5020", "rgba(255,212,168,0.2)"],
  silver: ["#d0d5dc", "#7a828c", "rgba(208,213,220,0.15)"]
};

  const categoryNames = {
    skill: "技能勋章",
    certificate: "证书勋章",
    training: "培训勋章"
  };

  const state = {
    engineers: [],
    search: "",
    region: "all",
    workLocation: "all",
    role: "all",
    badgeRange: "all",
    rankMode: "total",
    selectedEngineerId: null,
    badgeCategory: "skill",
    // 新增：三个勋章筛选的默认值
    skillBadge: "all",
    certificateBadge: "all",
    trainingBadge: "all"
  };

  const $ = (id) => document.getElementById(id);

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));

  function normalizeEngineer(raw) {
    const base = raw.base_info || {};
    const medals = raw.medals || {};
    const flatBadges = raw.badges || [
      ...(medals.skill_medals || []).map((item) => ({ ...item, category: "skill" })),
      ...(medals.certificate_medals || []).map((item) => ({ ...item, category: "certificate" })),
      ...(medals.training_medals || []).map((item) => ({ ...item, category: "training" }))
    ];

    const normalized = {
      id: raw.engineer_id || raw.id,
      engineer_id: raw.engineer_id || raw.id,
      name: raw.name || base.name,
      role: raw.role || base.role,
      region: raw.region || base.region,
      work_location: raw.work_location || base.work_location || '',
      startDate: raw.startDate || base.start_date,
      yearsOfService: raw.yearsOfService ?? raw.years_of_service ?? base.years_of_service,
      education: raw.education || base.education,
      school: raw.school || base.school,
      avatarTone: raw.avatarTone || raw.avatar?.tone || "cyan",
      avatar: raw.avatar || { type: "initial", tone: raw.avatarTone || "cyan" },
      badges: flatBadges.map((badge, index) => ({
        id: badge.id || `${raw.engineer_id || raw.id}-medal-${index + 1}`,
        name: badge.name,
        category: badge.category,
        rarity: badge.rarity,
        summary: badge.summary || badge.description,
        metric: badge.metric || badge.evidence || ""
      }))
    };

    normalized.medals = {
      skill_medals: normalized.badges.filter((badge) => badge.category === "skill"),
      certificate_medals: normalized.badges.filter((badge) => badge.category === "certificate"),
      training_medals: normalized.badges.filter((badge) => badge.category === "training")
    };
    normalized.rarity_summary = buildRaritySummary(normalized.badges);
    return normalized;
  }

  function buildRaritySummary(badges) {
    return Object.keys(rarityMap).reduce((summary, rarity) => {
      summary[rarity] = badges.filter((badge) => badge.rarity === rarity).length;
      return summary;
    }, {});
  }

  function getRarity(rarity) {
    return rarityMap[rarity] || rarityMap.common;
  }

  function getHighestRarity(engineer) {
    return [...engineer.badges].sort((a, b) => getRarity(b.rarity).rank - getRarity(a.rarity).rank)[0]?.rarity || "common";
  }

  function getTopBadges(engineer, limit = 3) {
    return [...engineer.badges]
      .sort((a, b) => getRarity(b.rarity).rank - getRarity(a.rarity).rank || a.name.localeCompare(b.name, "zh-CN"))
      .slice(0, limit);
  }

  function initials(name) {
    return String(name || "?").slice(-1);
  }

  function themeVars(rarity, tone) {
    const meta = getRarity(rarity);
    const colors = avatarTones[tone] || avatarTones.cyan;
    return [
      `--rarity-color:${meta.color}`,
      `--rarity-glow:${meta.glow}`,
      `--rarity-line:${meta.color}80`,
      `--avatar-a:${colors[0]}`,
      `--avatar-b:${colors[1]}`,
      `--avatar-glow:${colors[2]}`
    ].join(";");
  }

  function medalVars(rarity) {
    const meta = getRarity(rarity);
    return `--medal-fill:${meta.fill};--medal-glow:${meta.glow};`;
  }

  const Components = {
    engineerCard(engineer, index) {
      const rarity = getHighestRarity(engineer);
      const rarityName = getRarity(rarity).name;
      const topBadges = getTopBadges(engineer).map((badge) =>
        `<div class="medal-token" title="${escapeHtml(badge.name)}" style="${medalVars(badge.rarity)}"></div>`
      ).join("");

      return `
        <article class="engineer-card rarity-${rarity}" data-id="${escapeHtml(engineer.id)}" style="${themeVars(rarity, engineer.avatarTone)};animation-delay:${Math.min(index * 55 + Math.sin(index * 0.4) * 12, 420)}ms">
          <div class="portrait-node">${escapeHtml(initials(engineer.name))}</div>
          <div class="card-main">
            <h3>${escapeHtml(engineer.name)}</h3>
            <div class="card-role">${escapeHtml(engineer.role)}</div>
            <div class="card-meta">
              <div class="metric"><span>地区</span><b>${escapeHtml(engineer.region)}</b></div>
              <div class="metric"><span>工作地</span><b>${escapeHtml(engineer.work_location || '-')}</b></div>
              <div class="metric"><span>工龄</span><b>${escapeHtml(engineer.yearsOfService)}年</b></div>
              <div class="metric"><span>最高稀有度</span><b style="color:${getRarity(rarity).color}">${escapeHtml(rarityName)}</b></div>
              <div class="metric"><span>勋章</span><b>${engineer.badges.length}枚</b></div>
            </div>
          </div>
          <div class="mini-medals">${topBadges}</div>
        </article>
      `;
    },

    rankItem(item, index) {
      return `
        <div class="rank-item ${index < 3 ? "rank-top" : ""}" data-id="${escapeHtml(item.engineer.id)}">
          <div class="rank-no">${index < 3 ? ["I", "II", "III"][index] : index + 1}</div>
          <div class="rank-copy">
            <strong>${escapeHtml(item.engineer.name)}</strong>
            <span>${escapeHtml(item.engineer.role)}</span>
          </div>
          <div class="rank-score">${item.score}</div>
        </div>
      `;
    },

    medalCard(badge) {
      const meta = getRarity(badge.rarity);
      return `
        <article class="medal-card rarity-${escapeHtml(badge.rarity)}" style="${themeVars(badge.rarity, "cyan")};${medalVars(badge.rarity)}">
          <div class="medal-token" aria-hidden="true"></div>
          <h3>${escapeHtml(badge.name)}</h3>
          <p>${escapeHtml(meta.name)} · ${escapeHtml(badge.metric)}</p>
          <div class="tooltip">
            <strong>${escapeHtml(badge.name)}</strong>
            <span>${escapeHtml(badge.summary)}</span>
          </div>
        </article>
      `;
    }
  };

  function initFilters() {
    const regions = [...new Set(state.engineers.map((item) => item.region))].sort((a, b) => a.localeCompare(b, "zh-CN"));
    const workLocations = [...new Set(state.engineers.map((item) => item.work_location).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
    const roles = [...new Set(state.engineers.map((item) => item.role))].sort((a, b) => a.localeCompare(b, "zh-CN"));
    $("regionFilter").innerHTML = `<option value="all">全部</option>${regions.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    $("workLocationFilter").innerHTML = `<option value="all">全部</option>${workLocations.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    $("roleFilter").innerHTML = `<option value="all">全部</option>${roles.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
    const allBadges = state.engineers.flatMap(e => e.badges);
    const skillNames = [...new Set(allBadges.filter(b => b.category === "skill").map(b => b.name))].sort((a,b)=>a.localeCompare(b,"zh-CN"));
    $("skillFilter").innerHTML = `<option value="all">全部</option>${skillNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
    const certNames = [...new Set(allBadges.filter(b => b.category === "certificate").map(b => b.name))].sort((a,b)=>a.localeCompare(b,"zh-CN"));
    $("certificateFilter").innerHTML = `<option value="all">全部</option>${certNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
    const trainNames = [...new Set(allBadges.filter(b => b.category === "training").map(b => b.name))].sort((a,b)=>a.localeCompare(b,"zh-CN"));
    $("trainingFilter").innerHTML = `<option value="all">全部</option>${trainNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
  }

  function filteredEngineers() {
    const keyword = state.search.trim().toLowerCase();
    return state.engineers.filter((engineer) => {
      const inKeyword = !keyword || [engineer.name, engineer.region, engineer.role, engineer.work_location].some((field) => String(field).toLowerCase().includes(keyword));
      const inRegion = state.region === "all" || engineer.region === state.region;
      const inWorkLocation = state.workLocation === "all" || engineer.work_location === state.workLocation;
      const inRole = state.role === "all" || engineer.role === state.role;
      const count = engineer.badges.length;
      const inRange = state.badgeRange === "all" ||
        (state.badgeRange === "0-3" && count <= 3) ||
        (state.badgeRange === "4-5" && count >= 4 && count <= 5) ||
        (state.badgeRange === "6+" && count >= 6);
      const inSkill = state.skillBadge === "all" || engineer.badges.some(b => b.category === "skill" && b.name === state.skillBadge);
      const inCert = state.certificateBadge === "all" || engineer.badges.some(b => b.category === "certificate" && b.name === state.certificateBadge);
      const inTrain = state.trainingBadge === "all" || engineer.badges.some(b => b.category === "training" && b.name === state.trainingBadge);

      return inKeyword && inRegion && inWorkLocation && inRole && inRange && inSkill && inCert && inTrain;
    });
  }

  function renderCards() {
    const list = filteredEngineers();
    $("resultCount").textContent = `当前显示 ${list.length} / ${state.engineers.length} 位`;
    $("filterState").textContent = list.length === state.engineers.length ? "全部" : "已筛选";
    $("engineerGrid").innerHTML = list.length
      ? list.map(Components.engineerCard).join("")
      : `<div class="empty">未找到匹配的工程师档案</div>`;

    document.querySelectorAll(".engineer-card").forEach((card) => {
      card.addEventListener("click", () => showProfile(card.dataset.id));
    });
  }

  /* ========== 骨架屏 ========== */
  function showSkeleton() {
    const skeletonHtml = Array.from({ length: 6 }, () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-avatar"></div>
        <div>
          <div class="skeleton skeleton-line medium"></div>
          <div class="skeleton skeleton-line short"></div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;">
            <div class="skeleton" style="height:38px;"></div>
            <div class="skeleton" style="height:38px;"></div>
            <div class="skeleton" style="height:38px;"></div>
          </div>
        </div>
      </div>
    `).join("");
    $("engineerGrid").innerHTML = skeletonHtml;
  }

  function scoreFor(engineer, mode) {
    if (mode === "legendary") return engineer.badges.filter((badge) => badge.rarity === "legendary").length;
    if (mode === "skill") return engineer.badges.filter((badge) => badge.category === "skill").length;
    return engineer.badges.length;
  }

  function renderRankings(containerId) {
    const container = containerId || "rankList";
    const ranked = [...state.engineers]
      .map((engineer) => ({ engineer, score: scoreFor(engineer, state.rankMode) }))
      .sort((a, b) => b.score - a.score || a.engineer.name.localeCompare(b.engineer.name, "zh-CN"));

    $(container).innerHTML = ranked.map(Components.rankItem).join("");
    document.querySelectorAll(`#${container} .rank-item`).forEach((item) => {
      item.addEventListener("click", () => {
        closeRankModal();
        showProfile(item.dataset.id);
      });
    });
  }

  function renderProfile(engineer) {
    const highest = getHighestRarity(engineer);
    const highestMeta = getRarity(highest);
    $("profileHero").style.cssText = themeVars(highest, engineer.avatarTone);
    $("profileHero").innerHTML = `
      <div class="dossier-portrait">${escapeHtml(initials(engineer.name))}</div>
      <div class="dossier-copy">
        <p class="eyebrow">Engineer Dossier</p>
        <h2>${escapeHtml(engineer.name)}</h2>
        <div class="dossier-role">${escapeHtml(engineer.role)}</div>
        <div class="info-grid">
          <div class="metric"><span>所在地区</span><b>${escapeHtml(engineer.region)}</b></div>
          <div class="metric"><span>员工工作所在地</span><b>${escapeHtml(engineer.work_location || '-')}</b></div>
          <div class="metric"><span>入职时间</span><b>${escapeHtml(engineer.startDate)}</b></div>
          <div class="metric"><span>工龄</span><b>${escapeHtml(engineer.yearsOfService)}年</b></div>
          <div class="metric"><span>学历</span><b>${escapeHtml(engineer.education)}</b></div>
          <div class="metric"><span>毕业院校</span><b>${escapeHtml(engineer.school)}</b></div>
          <div class="metric"><span>最高稀有度</span><b style="color:${highestMeta.color}">${escapeHtml(highestMeta.name)}</b></div>
        </div>
      </div>
    `;

    $("overviewPanel").innerHTML = `
      <div class="panel-heading"><h2>成就总览</h2><span>Achievement</span></div>
      <div class="score-card"><span>勋章总数</span><b data-count="${engineer.badges.length}">0</b></div>
      <div class="rarity-grid">
        ${Object.entries(rarityMap).map(([key, meta]) => `
          <div class="rarity-stat" style="--rarity-color:${meta.color}">
            <span>${escapeHtml(meta.name)}</span>
            <b data-count="${engineer.rarity_summary[key] || 0}">0</b>
          </div>
        `).join("")}
      </div>
    `;
    animateCounts($("overviewPanel"));
    renderBadges(engineer);
  }

  function renderBadges(engineer) {
    const badges = engineer.badges
      .filter((badge) => badge.category === state.badgeCategory)
      .sort((a, b) => getRarity(b.rarity).rank - getRarity(a.rarity).rank || a.name.localeCompare(b.name, "zh-CN"));

    $("badgeTabHint").textContent = categoryNames[state.badgeCategory];
    $("badgesGrid").innerHTML = badges.length
      ? badges.map(Components.medalCard).join("")
      : `<div class="empty">暂无${escapeHtml(categoryNames[state.badgeCategory])}</div>`;
  }

  function animateCounts(root) {
    root.querySelectorAll("[data-count]").forEach((node) => {
      const target = Number(node.dataset.count || 0);
      const started = performance.now();
      const duration = 620;
      const tick = (now) => {
        const progress = Math.min((now - started) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function showHall() {
    $("profileView").classList.remove("view-active");
    $("mapView").classList.remove("view-active");
    $("hallView").classList.add("view-active");
    state.selectedEngineerId = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showProfile(id) {
    const engineer = state.engineers.find((item) => item.id === id);
    if (!engineer) return;
    state.selectedEngineerId = id;
    state.badgeCategory = "skill";
    document.querySelectorAll("#badgeTabs .tab").forEach((tab) => tab.classList.toggle("tab-active", tab.dataset.category === "skill"));
    $("hallView").classList.remove("view-active");
    $("mapView").classList.remove("view-active");
    $("profileView").classList.add("view-active");
    $("profileHint").textContent = `${engineer.name} · 工程师专属档案`;
    renderProfile(engineer);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ========== 工程师地图 (ECharts) ========== */

  // 城市 → 省份映射
  const CITY_PROVINCE = {
    "顺德": "广东省", "上海": "上海市", "沈阳": "辽宁省", "北京": "北京市",
    "长春": "吉林省", "苏州": "江苏省", "合肥": "安徽省", "成都": "四川省",
    "南京": "江苏省", "宁波": "浙江省", "西安": "陕西省", "汕尾": "广东省",
    "南昌": "江西省", "重庆": "重庆市", "郑州": "河南省", "徐州": "江苏省",
    "芜湖": "安徽省", "常州": "江苏省", "湘潭": "湖南省", "湖州": "浙江省",
    "金华": "浙江省", "义乌": "浙江省", "天津": "天津市", "保定": "河北省",
    "济南": "山东省", "潍坊": "山东省", "烟台": "山东省", "广州": "广东省",
    "深圳": "广东省", "宜昌": "湖北省", "武汉": "湖北省", "长沙": "湖南省",
    "宁德": "福建省", "无锡": "江苏省", "晋中": "山西省",
    "其他": "广东省", "抚州": "江西省"
  };

  // 城市经纬度 [lng, lat]（中国标准坐标）
  const CITY_COORDS = {
    "顺德": [113.29, 22.80], "上海": [121.47, 31.23], "沈阳": [123.43, 41.80],
    "北京": [116.41, 39.90], "长春": [125.32, 43.82], "苏州": [120.59, 31.30],
    "合肥": [117.23, 31.82], "成都": [104.07, 30.57], "南京": [118.79, 32.06],
    "宁波": [121.54, 29.87], "西安": [108.94, 34.26], "汕尾": [115.38, 22.79],
    "南昌": [115.86, 28.68], "重庆": [106.55, 29.57], "郑州": [113.62, 34.75],
    "徐州": [117.18, 34.27], "芜湖": [118.43, 31.35], "常州": [119.97, 31.81],
    "湘潭": [112.94, 27.83], "湖州": [120.09, 30.89], "金华": [119.65, 29.08],
    "义乌": [120.07, 29.31], "天津": [117.20, 39.13], "保定": [115.46, 38.87],
    "济南": [117.00, 36.67], "潍坊": [119.11, 36.62], "烟台": [121.45, 37.46],
    "广州": [113.26, 23.13], "宁德": [119.55, 26.66], "深圳": [114.06, 22.54],
    "宜昌": [111.29, 30.69], "武汉": [114.31, 30.52], "长沙": [112.94, 28.23],
    "无锡": [120.30, 31.57], "晋中": [112.75, 37.69], "其他": [113.26, 23.13],
    "抚州": [116.36, 27.95]
  };

  let chartInstance = null;
  let chartResizeHandler = null;

  function renderEChartsMap() {
    const container = document.getElementById("chinaMap");
    if (!container) return;

    if (chartInstance) {
      chartInstance.dispose();
      chartInstance = null;
    }
    if (chartResizeHandler) {
      window.removeEventListener("resize", chartResizeHandler);
      chartResizeHandler = null;
    }

    if (typeof echarts === "undefined") {
      container.innerHTML = '<div class="empty">ECharts 加载中，请刷新页面重试</div>';
      return;
    }

    container.innerHTML = "";

    fetch("china.json")
      .then(function (r) { return r.json(); })
      .catch(function () {
        return fetch("https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json")
          .then(function (r) { return r.json(); });
      })
      .then(function (geo) {
        echarts.registerMap("china", geo);

        // 省份 → 工程师数
        var provinceCount = {};
        state.engineers.forEach(function (eng) {
          var wl = eng.work_location;
          if (!wl) return;
          var province = CITY_PROVINCE[wl];
          if (!province) return;
          provinceCount[province] = (provinceCount[province] || 0) + 1;
        });
        var mapData = Object.entries(provinceCount).map(function (e) {
          return { name: e[0], value: e[1] };
        });

        // 城市 → 工程师列表
        var cityGroups = {};
        state.engineers.forEach(function (eng) {
          var wl = eng.work_location;
          if (!wl) return;
          var coord = CITY_COORDS[wl];
          if (!coord) return;
          if (!cityGroups[wl]) cityGroups[wl] = { coord: coord, engineers: [] };
          cityGroups[wl].engineers.push(eng);
        });

        var scatterData = Object.entries(cityGroups).map(function (entry) {
          var city = entry[0];
          var info = entry[1];
          return {
            name: city,
            value: info.coord.concat([info.engineers.length]),
            engineers: info.engineers
          };
        });

        chartInstance = echarts.init(container);

        var option = {
          tooltip: {
            trigger: "item",
            formatter: function (params) {
              if (params.seriesType === "map") {
                var count = params.value || 0;
                return "<strong>" + escapeHtml(params.name) + "</strong><br/>工程师：" + count + " 人";
              }
              if (params.seriesType === "effectScatter") {
                var data = params.data;
                if (!data || !data.engineers) return "";
                var lines = data.engineers.map(function (e) {
                  var highest = getHighestRarity(e);
                  var meta = getRarity(highest);
                  return '<span style="color:' + meta.color + '">' + escapeHtml(e.name) + "</span> · " + escapeHtml(e.role);
                });
                return "<strong>" + escapeHtml(data.name) + "</strong>（" + data.engineers.length + "人）<br/>" + lines.join("<br/>");
              }
              return "";
            }
          },
          geo: {
            map: "china",
            roam: true,
            zoom: 1.44,
            center: [105, 36],
            label: { show: false },
            itemStyle: {
              areaColor: "#e8e4de",
              borderColor: "#ffffff",
              borderWidth: 2.5,
              shadowColor: "rgba(0,0,0,0.5)",
              shadowBlur: 2
            },
            emphasis: {
              label: { show: true, color: "#333333" },
              itemStyle: { areaColor: "#fdd9b5" }
            },
            regions: [
              // 华东：上海、江苏、浙江、安徽 → 淡绿边框
              { name: "上海市", itemStyle: { areaColor: "#a8d5a2", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "江苏省", itemStyle: { areaColor: "#a8d5a2", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "浙江省", itemStyle: { areaColor: "#a8d5a2", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "安徽省", itemStyle: { areaColor: "#a8d5a2", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              // 北部：北京、天津、河北、山西、山东、内蒙古、陕西、甘肃、青海、宁夏、新疆 → 浅蓝填充+边框
              { name: "北京市", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "天津市", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "河北省", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "山西省", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "山东省", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "内蒙古自治区", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "陕西省", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "甘肃省", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "青海省", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "宁夏回族自治区", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "新疆维吾尔自治区", itemStyle: { areaColor: "#7ec8e3", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              // 中西：河南、湖北、湖南、江西、重庆、四川、贵州、西藏 → 深橙边框
              { name: "河南省", itemStyle: { areaColor: "#e67e22", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "湖北省", itemStyle: { areaColor: "#e67e22", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "湖南省", itemStyle: { areaColor: "#e67e22", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "江西省", itemStyle: { areaColor: "#e67e22", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "重庆市", itemStyle: { areaColor: "#e67e22", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "四川省", itemStyle: { areaColor: "#e67e22", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "贵州省", itemStyle: { areaColor: "#e67e22", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "西藏自治区", itemStyle: { areaColor: "#e67e22", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              // 华南：福建、广东、广西、云南、海南、台湾、香港、澳门 → 深蓝边框
              { name: "福建省", itemStyle: { areaColor: "#2e86c1", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "广东省", itemStyle: { areaColor: "#2e86c1", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "广西壮族自治区", itemStyle: { areaColor: "#2e86c1", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "云南省", itemStyle: { areaColor: "#2e86c1", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "海南省", itemStyle: { areaColor: "#2e86c1", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "台湾省", itemStyle: { areaColor: "#2e86c1", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "香港特别行政区", itemStyle: { areaColor: "#2e86c1", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "澳门特别行政区", itemStyle: { areaColor: "#2e86c1", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              // 东北：辽宁、吉林、黑龙江 → 浅橙填充+边框
              { name: "辽宁省", itemStyle: { areaColor: "#f5b041", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "吉林省", itemStyle: { areaColor: "#f5b041", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } },
              { name: "黑龙江省", itemStyle: { areaColor: "#f5b041", borderColor: "#ffffff", borderWidth: 2.5, shadowColor: "rgba(0,0,0,0.5)", shadowBlur: 2 } }
            ]
          },
          series: [
            {
              name: "工程师分布",
              type: "map",
              map: "china",
              geoIndex: 0,
              data: mapData
            },
            {
              name: "城市驻点",
              type: "effectScatter",
              coordinateSystem: "geo",
              data: scatterData,
              symbolSize: function (val) { return Math.max(6, Math.min(32, val[2] * 8 + 4)); },
              showEffectOn: "render",
              rippleEffect: { brushType: "stroke", scale: 2.5 },
              itemStyle: { color: "#ff6b00", shadowBlur: 8, shadowColor: "rgba(255,107,0,0.35)" },
              label: {
                show: true,
                formatter: function (p) { return p.name; },
                position: "right",
                fontSize: 10,
                color: "#495057",
                offset: [2, 0]
              },
              labelLayout: { moveOverlap: "shiftY" },
              emphasis: { scale: 1.5 }
            }
          ]
        };

        chartInstance.setOption(option);

        // Click scatter → open profile
        chartInstance.on("click", function (params) {
          if (params.seriesType === "effectScatter" && params.data && params.data.engineers) {
            var engs = params.data.engineers;
            if (engs.length === 1) {
              hideMap();
              showProfile(engs[0].id);
            }
          }
        });

        chartResizeHandler = function () {
          if (chartInstance && !chartInstance.isDisposed()) {
            chartInstance.resize();
          }
        };
        window.addEventListener("resize", chartResizeHandler);
      })
      .catch(function () {
        container.innerHTML = '<div class="empty">地图数据加载失败，请检查网络连接后刷新重试</div>';
      });
  }

  function showMap() {
    $("hallView").classList.remove("view-active");
    $("profileView").classList.remove("view-active");
    $("mapView").classList.add("view-active");
    state.selectedEngineerId = null;
    renderEChartsMap();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function hideMap() {
    $("mapView").classList.remove("view-active");
  }

  function openRankModal() {
    $("rankModal").classList.add("show");
    $("rankModal").setAttribute("aria-hidden", "false");
    // 同步弹窗内的 tab 高亮
    document.querySelectorAll("#rankModalTabs .tab").forEach((tab) => {
      tab.classList.toggle("tab-active", tab.dataset.rank === state.rankMode);
    });
    renderRankings("rankModalList");
    document.body.style.overflow = "hidden";
  }

  function closeRankModal() {
    $("rankModal").classList.remove("show");
    $("rankModal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function bindEvents() {
    $("searchInput").addEventListener("input", (event) => {
      state.search = event.target.value;
      renderCards();
    });
    $("regionFilter").addEventListener("change", (event) => {
      state.region = event.target.value;
      renderCards();
    });
    $("workLocationFilter").addEventListener("change", (event) => {
      state.workLocation = event.target.value;
      renderCards();
    });
    $("roleFilter").addEventListener("change", (event) => {
      state.role = event.target.value;
      renderCards();
    });
    $("badgeFilter").addEventListener("change", (event) => {
      state.badgeRange = event.target.value;
      renderCards();
    });
    $("skillFilter").addEventListener("change", (event) => {
      state.skillBadge = event.target.value;
      renderCards();
    });
    $("certificateFilter").addEventListener("change", (event) => {
      state.certificateBadge = event.target.value;
      renderCards();
    });
    $("trainingFilter").addEventListener("change", (event) => {
      state.trainingBadge = event.target.value;
      renderCards();
    });

    $("resetFilters").addEventListener("click", () => {
      state.search = "";
      state.region = "all";
      state.workLocation = "all";
      state.role = "all";
      state.badgeRange = "all";
      // 新增：重置三个勋章筛选
      state.skillBadge = "all";
      state.certificateBadge = "all";
      state.trainingBadge = "all";

      $("searchInput").value = "";
      $("regionFilter").value = "all";
      $("workLocationFilter").value = "all";
      $("roleFilter").value = "all";
      $("badgeFilter").value = "all";
      // 新增：重置三个下拉框显示
      $("skillFilter").value = "all";
      $("certificateFilter").value = "all";
      $("trainingFilter").value = "all";

      renderCards();
    });
    $("rankEntry").addEventListener("click", openRankModal);
    $("rankModalClose").addEventListener("click", closeRankModal);
    $("rankModal").addEventListener("click", (event) => {
      if (event.target === $("rankModal")) closeRankModal();
    });
    $("rankModalTabs").addEventListener("click", (event) => {
      const tab = event.target.closest(".tab");
      if (!tab) return;
      state.rankMode = tab.dataset.rank;
      document.querySelectorAll("#rankModalTabs .tab").forEach((item) => item.classList.toggle("tab-active", item === tab));
      renderRankings("rankModalList");
    });
    $("rankTabs").addEventListener("click", (event) => {
      const tab = event.target.closest(".tab");
      if (!tab) return;
      state.rankMode = tab.dataset.rank;
      document.querySelectorAll("#rankTabs .tab").forEach((item) => item.classList.toggle("tab-active", item === tab));
      renderRankings();
    });
    $("badgeTabs").addEventListener("click", (event) => {
      const tab = event.target.closest(".tab");
      if (!tab || !state.selectedEngineerId) return;
      state.badgeCategory = tab.dataset.category;
      document.querySelectorAll("#badgeTabs .tab").forEach((item) => item.classList.toggle("tab-active", item === tab));
      renderBadges(state.engineers.find((item) => item.id === state.selectedEngineerId));
    });
    $("backBtn").addEventListener("click", showHall);
    $("mapEntry").addEventListener("click", showMap);
    $("mapBackBtn").addEventListener("click", showHall);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && $("rankModal").classList.contains("show")) {
        closeRankModal();
      }
    });
  }

  async function loadData() {
    showSkeleton();
    $("resultCount").textContent = "正在加载...";
    try {
      const response = await fetch("data.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      state.engineers = Array.isArray(data.engineers) ? data.engineers.map(normalizeEngineer) : [];
      $("siteTitle").textContent = data.site?.title || "KUKA Customer Service";
      document.title = data.site?.title || "KUKA Customer Service";
      initFilters();
      renderCards();
      renderRankings();
      document.body.classList.add("data-ready");
    } catch (error) {
      $("loadError").classList.add("show");
      $("loadError").textContent = "data.json 读取失败。请确认 index.html 与 data.json 位于同一目录，并通过本地静态服务打开页面。";
      $("resultCount").textContent = "数据未载入";
      $("engineerGrid").innerHTML = `<div class="empty">等待 data.json 数据</div>`;
    }
  }

  bindEvents();
  loadData();
}());
