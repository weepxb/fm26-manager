const SUPABASE_URL =
  "https://jcnlczwhffefnpiugsgl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable__hJQCGJf2tQKj3sGfbYBHA_aytxc0I8";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

let currentUser = null;
let syncTimer = null;
let isLoadingRemote = false;

let players =
  JSON.parse(localStorage.getItem("fm26Players")) || [];

let selectedPlayerId = null;
let selectedDecision = "保留";
let selectedLoanStatus = "none";
let editingPlayerId = null;
let currentSort = "default";

const authOverlay =
  document.getElementById("authOverlay");
const authEmail =
  document.getElementById("authEmail");
const authPassword =
  document.getElementById("authPassword");
const signInButton =
  document.getElementById("signInButton");
const signUpButton =
  document.getElementById("signUpButton");
const signOutButton =
  document.getElementById("signOutButton");
const authMessage =
  document.getElementById("authMessage");
const cloudSyncStatus =
  document.getElementById("cloudSyncStatus");

const playerTableBody = document.getElementById("playerTableBody");
const playerCount = document.getElementById("playerCount");
const playerModal = document.getElementById("playerModal");
const addPlayerButton = document.getElementById("addPlayerButton");
const deleteAllButton = document.getElementById("deleteAllButton");
const closeModalButton = document.getElementById("closeModalButton");
const savePlayerButton = document.getElementById("savePlayerButton");
const editPlayerButton = document.getElementById("editPlayerButton");
const deletePlayerButton = document.getElementById("deletePlayerButton");
const loanInButton = document.getElementById("loanInButton");
const loanOutButton = document.getElementById("loanOutButton");
const decisionButtons = document.querySelectorAll(".decision-select-button");
const filterBar = document.getElementById("filterBar");
const positionSummary = document.getElementById("positionSummary");
const sortSelect = document.getElementById("sortSelect");
const globalGameDate =
  document.getElementById("globalGameDate");
const globalCountry =
  document.getElementById("globalCountry");
const globalLeague =
  document.getElementById("globalLeague");
const leagueDataStatus =
  document.getElementById("leagueDataStatus");

const birthYear =
  document.getElementById("birthYear");
const birthMonth =
  document.getElementById("birthMonth");
const birthDay =
  document.getElementById("birthDay");
const birthDateInput =
  document.getElementById("birthDate");

const salaryUnit =
  document.getElementById("salaryUnit");
const marketValueUnit =
  document.getElementById("marketValueUnit");

const contractUpdateButton =
  document.getElementById("contractUpdateButton");
const contractModal =
  document.getElementById("contractModal");
const closeContractModalButton =
  document.getElementById("closeContractModalButton");
const saveContractUpdateButton =
  document.getElementById("saveContractUpdateButton");
const contractNewSalary =
  document.getElementById("contractNewSalary");
const contractNewSalaryUnit =
  document.getElementById("contractNewSalaryUnit");
const contractNewStart =
  document.getElementById("contractNewStart");
const contractNewEnd =
  document.getElementById("contractNewEnd");
const contractNewPlayingTime =
  document.getElementById("contractNewPlayingTime");
const contractNewType =
  document.getElementById("contractNewType");
const contractUpdateDate =
  document.getElementById("contractUpdateDate");
const contractChangePreview =
  document.getElementById("contractChangePreview");
const contractHistoryList =
  document.getElementById("contractHistoryList");

const requestedSalary =
  document.getElementById("requestedSalary");
const requestedSalaryUnit =
  document.getElementById("requestedSalaryUnit");
const requestedSalaryVerdict =
  document.getElementById("requestedSalaryVerdict");

const editExternalMarketButton =
  document.getElementById("editExternalMarketButton");
const externalMarketModal =
  document.getElementById("externalMarketModal");
const closeExternalMarketModalButton =
  document.getElementById("closeExternalMarketModalButton");
const saveExternalMarketButton =
  document.getElementById("saveExternalMarketButton");
const externalSalaryLow =
  document.getElementById("externalSalaryLow");
const externalSalaryLowUnit =
  document.getElementById("externalSalaryLowUnit");
const externalSalaryHigh =
  document.getElementById("externalSalaryHigh");
const externalSalaryHighUnit =
  document.getElementById("externalSalaryHighUnit");
const externalSalaryMedian =
  document.getElementById("externalSalaryMedian");
const externalSalaryMedianUnit =
  document.getElementById("externalSalaryMedianUnit");
const externalSalarySource =
  document.getElementById("externalSalarySource");
const externalMarketPreview =
  document.getElementById("externalMarketPreview");

const currentAbilityCertain =
  document.getElementById("currentAbilityCertain");
const currentAbilityMax =
  document.getElementById("currentAbilityMax");
const potentialAbilityCertain =
  document.getElementById("potentialAbilityCertain");
const potentialAbilityMax =
  document.getElementById("potentialAbilityMax");

const FIELD_PLAYING_TIME_OPTIONS = [
  "スター選手",
  "重要な選手",
  "先発レギュラー",
  "バックアッパー",
  "当落線上の選手",
  "有望選手",
  "若手",
  "要求能力に満たない余剰人員"
];

const GK_PLAYING_TIME_OPTIONS = [
  "スター選手",
  "重要な選手",
  "正ゴールキーパー",
  "カップ戦要員ゴールキーパー",
  "バックアップ",
  "要求能力に満たない余剰人員"
];

const ABILITY_VALUES = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
];

const mainPositionInput =
  document.getElementById("mainPosition");

const playingTimeSelect =
  document.getElementById("playingTime");

function savePlayers() {
  localStorage.setItem(
    "fm26Players",
    JSON.stringify(players)
  );

  if (
    currentUser &&
    !isLoadingRemote
  ) {
    scheduleCloudSync();
  }
}

function setCloudStatus(
  text,
  state = ""
) {
  cloudSyncStatus.textContent = text;
  cloudSyncStatus.className =
    `cloud-sync-status ${state}`.trim();
}

function scheduleCloudSync() {
  clearTimeout(syncTimer);

  syncTimer =
    setTimeout(
      syncAllToCloud,
      450
    );
}

async function syncAllToCloud() {
  if (!currentUser) {
    return;
  }

  try {
    setCloudStatus(
      "☁ 同期中…",
      "syncing"
    );

    const rows =
      players.map(
        (player, index) => ({
          id: player.id,
          user_id: currentUser.id,
          data: {
            ...player,
            _syncOrder: index
          },
          updated_at:
            new Date().toISOString()
        })
      );

    if (rows.length > 0) {
      const {
        error: upsertError
      } =
        await supabaseClient
          .from("fm26_players")
          .upsert(
            rows,
            {
              onConflict: "id"
            }
          );

      if (upsertError) {
        throw upsertError;
      }
    }

    const {
      data: remoteRows,
      error: listError
    } =
      await supabaseClient
        .from("fm26_players")
        .select("id")
        .eq(
          "user_id",
          currentUser.id
        );

    if (listError) {
      throw listError;
    }

    const localIds =
      new Set(
        players.map(
          player => player.id
        )
      );

    const staleIds =
      (remoteRows || [])
        .map(row => row.id)
        .filter(
          id =>
            !localIds.has(id)
        );

    if (staleIds.length > 0) {
      const {
        error: deleteError
      } =
        await supabaseClient
          .from("fm26_players")
          .delete()
          .eq(
            "user_id",
            currentUser.id
          )
          .in(
            "id",
            staleIds
          );

      if (deleteError) {
        throw deleteError;
      }
    }

    await syncSettingsToCloud();

    setCloudStatus(
      "☁ 同期済み",
      "synced"
    );
  } catch (error) {
    console.error(error);

    setCloudStatus(
      "☁ 同期エラー",
      "error"
    );
  }
}

async function syncSettingsToCloud() {
  if (!currentUser) {
    return;
  }

  const payload = {
    user_id: currentUser.id,
    game_date:
      getGlobalGameDate() || null,
    country:
      globalCountry.value ||
      "Germany",
    league:
      globalLeague.value ||
      "3-liga",
    updated_at:
      new Date().toISOString()
  };

  const {
    error
  } =
    await supabaseClient
      .from("fm26_settings")
      .upsert(
        payload,
        {
          onConflict: "user_id"
        }
      );

  if (error) {
    throw error;
  }
}


function getLastCheckedDateDefault() {
  return (
    localStorage.getItem(
      "fm26LastCheckedDate"
    ) || ""
  );
}

function saveLastCheckedDateDefault(value) {
  if (!value) {
    return;
  }

  localStorage.setItem(
    "fm26LastCheckedDate",
    value
  );
}


function getGlobalGameDate() {
  return (
    localStorage.getItem(
      "fm26GlobalGameDate"
    ) || ""
  );
}

function saveGlobalGameDate(value) {
  if (!value) {
    return;
  }

  localStorage.setItem(
    "fm26GlobalGameDate",
    value
  );

  if (
    currentUser &&
    !isLoadingRemote
  ) {
    scheduleCloudSync();
  }
}


function syncBirthDateFromParts() {
  const year =
    String(birthYear.value || "").trim();

  const month =
    String(birthMonth.value || "").trim();

  const day =
    String(birthDay.value || "").trim();

  if (!year && !month && !day) {
    birthDateInput.value = "";
    return "";
  }

  if (
    year.length !== 4 ||
    !month ||
    !day
  ) {
    birthDateInput.value = "";
    return "";
  }

  const yearNumber =
    Number(year);

  const monthNumber =
    Number(month);

  const dayNumber =
    Number(day);

  if (
    yearNumber < 1900 ||
    yearNumber > 2100 ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    dayNumber > 31
  ) {
    birthDateInput.value = "";
    return "";
  }

  const candidate =
    new Date(
      yearNumber,
      monthNumber - 1,
      dayNumber
    );

  if (
    candidate.getFullYear() !== yearNumber ||
    candidate.getMonth() !== monthNumber - 1 ||
    candidate.getDate() !== dayNumber
  ) {
    birthDateInput.value = "";
    return "";
  }

  const iso =
    `${year}-${String(monthNumber).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;

  birthDateInput.value = iso;

  return iso;
}

function setBirthDateParts(value) {
  if (!value) {
    birthYear.value = "";
    birthMonth.value = "";
    birthDay.value = "";
    birthDateInput.value = "";
    return;
  }

  const parts =
    String(value).split("-");

  birthYear.value =
    parts[0] || "";

  birthMonth.value =
    parts[1]
      ? Number(parts[1])
      : "";

  birthDay.value =
    parts[2]
      ? Number(parts[2])
      : "";

  birthDateInput.value = value;
}

function moveBirthFocusIfComplete(
  input,
  nextInput,
  digits
) {
  input.addEventListener(
    "input",
    () => {
      let value =
        String(input.value || "")
          .replace(/\D/g, "");

      if (value.length > digits) {
        value =
          value.slice(0, digits);
      }

      input.value = value;

      syncBirthDateFromParts();

      if (
        value.length === digits &&
        nextInput
      ) {
        nextInput.focus();
        nextInput.select();
      }
    }
  );
}

moveBirthFocusIfComplete(
  birthYear,
  birthMonth,
  4
);

moveBirthFocusIfComplete(
  birthMonth,
  birthDay,
  2
);

moveBirthFocusIfComplete(
  birthDay,
  null,
  2
);

birthMonth.addEventListener(
  "blur",
  () => {
    if (
      birthMonth.value &&
      Number(birthMonth.value) >= 1 &&
      Number(birthMonth.value) <= 9
    ) {
      birthMonth.value =
        Number(birthMonth.value);
    }

    syncBirthDateFromParts();
  }
);

birthDay.addEventListener(
  "blur",
  syncBirthDateFromParts
);

function calculateAge(birthDate, gameDate, fallbackAge = null) {
  if (!birthDate || !gameDate) {
    return fallbackAge ?? null;
  }

  const birth = new Date(`${birthDate}T00:00:00`);
  const current = new Date(`${gameDate}T00:00:00`);

  if (
    Number.isNaN(birth.getTime()) ||
    Number.isNaN(current.getTime()) ||
    current < birth
  ) {
    return fallbackAge ?? null;
  }

  let age =
    current.getFullYear() -
    birth.getFullYear();

  const monthDiff =
    current.getMonth() -
    birth.getMonth();

  if (
    monthDiff < 0 ||
    (
      monthDiff === 0 &&
      current.getDate() <
      birth.getDate()
    )
  ) {
    age -= 1;
  }

  return age;
}

function calculateContractRemaining(contractEnd, gameDate) {
  if (!contractEnd || !gameDate) {
    return "-";
  }

  const end =
    new Date(`${contractEnd}T00:00:00`);

  const current =
    new Date(`${gameDate}T00:00:00`);

  if (
    Number.isNaN(end.getTime()) ||
    Number.isNaN(current.getTime())
  ) {
    return "-";
  }

  if (end < current) {
    return "満了";
  }

  let years =
    end.getFullYear() -
    current.getFullYear();

  let anniversary =
    new Date(
      current.getFullYear() + years,
      current.getMonth(),
      current.getDate()
    );

  if (anniversary > end) {
    years -= 1;

    anniversary =
      new Date(
        current.getFullYear() + years,
        current.getMonth(),
        current.getDate()
      );
  }

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  const days =
    Math.max(
      0,
      Math.round(
        (end - anniversary) /
        millisecondsPerDay
      )
    );

  if (years > 0) {
    return `${years}年${days}日`;
  }

  return `${days}日`;
}

function getPlayerDisplayAge(player) {
  return calculateAge(
    player.birthDate,
    getGlobalGameDate(),
    player.age
  );
}

function fillAbilitySelect(select, selectedValue = 3) {
  select.innerHTML = "";

  ABILITY_VALUES.forEach(value => {
    const option =
      document.createElement("option");

    option.value = String(value);
    option.textContent = `★${value}`;

    select.appendChild(option);
  });

  select.value = String(selectedValue);
}

function keepMaxAtLeastCertain(certainSelect, maxSelect) {
  const certain =
    Number(certainSelect.value);

  const max =
    Number(maxSelect.value);

  if (max < certain) {
    maxSelect.value =
      certainSelect.value;
  }
}

currentAbilityCertain.addEventListener("change", () => {
  keepMaxAtLeastCertain(
    currentAbilityCertain,
    currentAbilityMax
  );
});

currentAbilityMax.addEventListener("change", () => {
  keepMaxAtLeastCertain(
    currentAbilityCertain,
    currentAbilityMax
  );
});

potentialAbilityCertain.addEventListener("change", () => {
  keepMaxAtLeastCertain(
    potentialAbilityCertain,
    potentialAbilityMax
  );
});

potentialAbilityMax.addEventListener("change", () => {
  keepMaxAtLeastCertain(
    potentialAbilityCertain,
    potentialAbilityMax
  );
});

function formatAbilityText(certain, max) {
  const certainNumber =
    Number(certain);

  const maxNumber =
    Number(max);

  if (maxNumber > certainNumber) {
    return `★${certainNumber}〜★${maxNumber}`;
  }

  return `★${certainNumber}`;
}

function renderAbilityHtml(certain, max) {
  const certainNumber =
    Number(certain);

  const maxNumber =
    Number(max);

  if (maxNumber > certainNumber) {
    return `
      <span class="ability-range">
        <span class="ability-certain">★${certainNumber}</span>
        <span class="ability-uncertain">〜★${maxNumber}</span>
      </span>
    `;
  }

  return `
    <span class="ability-range">
      <span class="ability-certain">★${certainNumber}</span>
    </span>
  `;
}



const LEAGUE_CATALOG = {
  Germany: {
    label: "ドイツ",
    leagues: [
      ["bundesliga", "Bundesliga"],
      ["2-bundesliga", "2. Bundesliga"],
      ["3-liga", "3. Liga"]
    ]
  },

  England: {
    label: "イングランド",
    leagues: [
      ["premier-league", "Premier League"],
      ["championship", "Championship"],
      ["league-one", "League One"],
      ["league-two", "League Two"]
    ]
  },

  France: {
    label: "フランス",
    leagues: [
      ["ligue-1", "Ligue 1"],
      ["ligue-2", "Ligue 2"]
    ]
  },

  Spain: {
    label: "スペイン",
    leagues: [
      ["laliga", "LaLiga"],
      ["laliga2", "LaLiga 2"]
    ]
  },

  Italy: {
    label: "イタリア",
    leagues: [
      ["serie-a", "Serie A"],
      ["serie-b", "Serie B"]
    ]
  },

  Netherlands: {
    label: "オランダ",
    leagues: [
      ["eredivisie", "Eredivisie"],
      ["eerste-divisie", "Eerste Divisie"]
    ]
  },

  Portugal: {
    label: "ポルトガル",
    leagues: [
      ["primeira-liga", "Primeira Liga"],
      ["liga-portugal-2", "Liga Portugal 2"]
    ]
  },

  Belgium: {
    label: "ベルギー",
    leagues: [
      ["pro-league", "Jupiler Pro League"],
      ["challenger-pro-league", "Challenger Pro League"]
    ]
  }
};

/*
  内蔵相場モデル
  ----------------
  3. Liga は公開されているリーグ市場価値・クラブ給与水準を
  基準データとして使用。
  他リーグは、公開給与データのカバレッジ差が大きいため、
  欧州リーグの給与水準とリーグ階層をもとにした
  「参考モデル」として持たせています。

  exactSalaryData:
    true  = 比較的直接的な公開給与サンプルを基準
    false = 公開データ＋リーグ階層補正の参考モデル
*/
const LEAGUE_REAL_DATA = {
  "Germany|bundesliga": {
    countryLabel: "ドイツ",
    leagueLabel: "Bundesliga",
    season: "2025/26参考",
    salaryToMarketRatio: 0.105,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Germany|2-bundesliga": {
    countryLabel: "ドイツ",
    leagueLabel: "2. Bundesliga",
    season: "2025/26参考",
    salaryToMarketRatio: 0.155,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Germany|3-liga": {
    countryLabel: "ドイツ",
    leagueLabel: "3. Liga",
    season: "2025/26〜2026参考",
    salaryToMarketRatio: 70450 / 297000,
    sourceLabel: "Transfermarkt＋公開クラブ給与データ",
    exactSalaryData: true
  },

  "England|premier-league": {
    countryLabel: "イングランド",
    leagueLabel: "Premier League",
    season: "2025/26参考",
    salaryToMarketRatio: 0.125,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "England|championship": {
    countryLabel: "イングランド",
    leagueLabel: "Championship",
    season: "2025/26参考",
    salaryToMarketRatio: 0.185,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "England|league-one": {
    countryLabel: "イングランド",
    leagueLabel: "League One",
    season: "2025/26参考",
    salaryToMarketRatio: 0.225,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "England|league-two": {
    countryLabel: "イングランド",
    leagueLabel: "League Two",
    season: "2025/26参考",
    salaryToMarketRatio: 0.250,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "France|ligue-1": {
    countryLabel: "フランス",
    leagueLabel: "Ligue 1",
    season: "2025/26参考",
    salaryToMarketRatio: 0.105,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "France|ligue-2": {
    countryLabel: "フランス",
    leagueLabel: "Ligue 2",
    season: "2025/26参考",
    salaryToMarketRatio: 0.175,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Spain|laliga": {
    countryLabel: "スペイン",
    leagueLabel: "LaLiga",
    season: "2025/26参考",
    salaryToMarketRatio: 0.110,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Spain|laliga2": {
    countryLabel: "スペイン",
    leagueLabel: "LaLiga 2",
    season: "2025/26参考",
    salaryToMarketRatio: 0.165,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Italy|serie-a": {
    countryLabel: "イタリア",
    leagueLabel: "Serie A",
    season: "2025/26参考",
    salaryToMarketRatio: 0.115,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Italy|serie-b": {
    countryLabel: "イタリア",
    leagueLabel: "Serie B",
    season: "2025/26参考",
    salaryToMarketRatio: 0.170,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Netherlands|eredivisie": {
    countryLabel: "オランダ",
    leagueLabel: "Eredivisie",
    season: "2025/26参考",
    salaryToMarketRatio: 0.125,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Netherlands|eerste-divisie": {
    countryLabel: "オランダ",
    leagueLabel: "Eerste Divisie",
    season: "2025/26参考",
    salaryToMarketRatio: 0.195,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Portugal|primeira-liga": {
    countryLabel: "ポルトガル",
    leagueLabel: "Primeira Liga",
    season: "2025/26参考",
    salaryToMarketRatio: 0.115,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Portugal|liga-portugal-2": {
    countryLabel: "ポルトガル",
    leagueLabel: "Liga Portugal 2",
    season: "2025/26参考",
    salaryToMarketRatio: 0.185,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Belgium|pro-league": {
    countryLabel: "ベルギー",
    leagueLabel: "Jupiler Pro League",
    season: "2025/26参考",
    salaryToMarketRatio: 0.125,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  },

  "Belgium|challenger-pro-league": {
    countryLabel: "ベルギー",
    leagueLabel: "Challenger Pro League",
    season: "2025/26参考",
    salaryToMarketRatio: 0.190,
    sourceLabel: "公開給与データ＋市場価値参考モデル",
    exactSalaryData: false
  }
};

const COMMON_POSITION_FACTORS = {
  GK: 0.94,
  CB: 1.00,
  LB: 0.98,
  RB: 0.98,
  LWB: 0.99,
  RWB: 0.99,
  DM: 1.02,
  CM: 1.03,
  AM: 1.06,
  AMC: 1.06,
  AML: 1.07,
  AMR: 1.07,
  LM: 1.03,
  RM: 1.03,
  ST: 1.10,
  CF: 1.10
};

Object.values(
  LEAGUE_REAL_DATA
).forEach(data => {
  data.positionFactors =
    COMMON_POSITION_FACTORS;
});

function populateCountryOptions() {
  globalCountry.innerHTML =
    Object.entries(
      LEAGUE_CATALOG
    )
      .map(
        ([value, item]) =>
          `<option value="${value}">${item.label}</option>`
      )
      .join("");
}

function populateLeagueOptions(
  preferredLeague = null
) {
  const country =
    LEAGUE_CATALOG[
      globalCountry.value
    ];

  if (!country) {
    globalLeague.innerHTML = "";
    return;
  }

  globalLeague.innerHTML =
    country.leagues
      .map(
        ([value, label]) =>
          `<option value="${value}">${label}</option>`
      )
      .join("");

  if (
    preferredLeague &&
    country.leagues.some(
      ([value]) =>
        value === preferredLeague
    )
  ) {
    globalLeague.value =
      preferredLeague;
  }
}

function getLeagueKey() {
  return (
    `${globalCountry.value}|${globalLeague.value}`
  );
}

function getLeagueRealData() {
  return (
    LEAGUE_REAL_DATA[
      getLeagueKey()
    ] || null
  );
}

function saveGlobalLeague() {
  localStorage.setItem(
    "fm26GlobalCountry",
    globalCountry.value
  );

  localStorage.setItem(
    "fm26GlobalLeague",
    globalLeague.value
  );

  if (
    currentUser &&
    !isLoadingRemote
  ) {
    scheduleCloudSync();
  }
}

function updateLeagueDataStatus() {
  const data =
    getLeagueRealData();

  leagueDataStatus.classList.remove(
    "ready",
    "missing"
  );

  if (!data) {
    leagueDataStatus.textContent =
      "このリーグのリアル相場データはまだ未登録です。クラブ内相場と手動参考相場はそのまま使えます。";

    leagueDataStatus.classList.add(
      "missing"
    );
    return;
  }

  const qualityLabel =
    data.exactSalaryData
      ? "公開給与サンプル基準"
      : "内蔵参考モデル";

  leagueDataStatus.textContent =
    `${data.countryLabel} / ${data.leagueLabel}：${qualityLabel}（${data.season}）`;

  leagueDataStatus.classList.add(
    "ready"
  );
}

function getPositionFactor(position, data) {
  if (!data) {
    return 1;
  }

  const key =
    String(position || "")
      .trim()
      .toUpperCase();

  return (
    data.positionFactors[key] || 1
  );
}

function getAgeFactor(player) {
  const age =
    getPlayerDisplayAge(player);

  if (
    age === null ||
    age === undefined
  ) {
    return 1;
  }

  if (age <= 20) {
    return 0.88;
  }

  if (age <= 23) {
    return 0.95;
  }

  if (age <= 29) {
    return 1.05;
  }

  if (age <= 32) {
    return 1.00;
  }

  return 0.92;
}

function buildAutomaticRealMarket(player) {
  const data =
    getLeagueRealData();

  const marketValue =
    Number(player.marketValue);

  if (
    !data ||
    !Number.isFinite(marketValue) ||
    marketValue <= 0
  ) {
    return null;
  }

  const base =
    marketValue *
    data.salaryToMarketRatio;

  const adjusted =
    base *
    getPositionFactor(
      player.mainPosition,
      data
    ) *
    getAgeFactor(player);

  /*
    リアル給与は推定値・クラブ差が大きいため、
    点ではなく広めのレンジにする。
  */
  const low =
    Math.round(
      adjusted * 0.72
    );

  const high =
    Math.round(
      adjusted * 1.35
    );

  const middle =
    Math.round(adjusted);

  return {
    low,
    high,
    median: middle,
    source:
      `${data.sourceLabel} / ${data.leagueLabel} ${data.season}`,
    automatic: true,
    exactSalaryData:
      Boolean(data.exactSalaryData),
    data
  };
}

function moneyInputToNumber(value, unit) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return null;
  }

  if (unit === "億") {
    return Math.round(
      number * 100000000
    );
  }

  return Math.round(
    number * 10000
  );
}

function moneyNumberToInput(value) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return {
      value: "",
      unit: "万"
    };
  }

  if (number >= 100000000) {
    return {
      value:
        Math.round(
          (number / 100000000) * 100
        ) / 100,
      unit: "億"
    };
  }

  return {
    value:
      Math.round(
        (number / 10000) * 10
      ) / 10,
    unit: "万"
  };
}

function setMoneyField(
  inputElement,
  unitElement,
  value
) {
  const converted =
    moneyNumberToInput(value);

  inputElement.value =
    converted.value;

  unitElement.value =
    converted.unit;
}

function parseJapaneseMoney(input) {
  if (!input) return null;

  const value = String(input)
    .trim()
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/円/g, "");

  if (!value) return null;

  if (/^\d+(\.\d+)?$/.test(value)) {
    return Math.round(Number(value));
  }

  let total = 0;

  const okuMatch = value.match(/([\d.]+)億/);
  const manMatch = value.match(/([\d.]+)万/);

  if (okuMatch) {
    total += Number(okuMatch[1]) * 100000000;
  }

  if (manMatch) {
    total += Number(manMatch[1]) * 10000;
  }

  return total > 0 ? Math.round(total) : null;
}

function formatJapaneseMoney(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "-";
  }

  if (number >= 100000000) {
    const oku =
      Math.round((number / 100000000) * 100) / 100;

    return `${oku}億`;
  }

  if (number >= 10000) {
    const man =
      Math.round(number / 10000);

    return `${man.toLocaleString("ja-JP")}万`;
  }

  return number.toLocaleString("ja-JP");
}




function getExternalMarket(player) {
  if (
    player.externalSalaryMarket &&
    player.externalSalaryMarket.low &&
    player.externalSalaryMarket.high
  ) {
    return {
      ...player.externalSalaryMarket,
      automatic: false
    };
  }

  return (
    buildAutomaticRealMarket(player)
  );
}

function renderExternalSalaryMarket(player) {
  const range =
    document.getElementById(
      "detailExternalSalaryRange"
    );

  const middle =
    document.getElementById(
      "detailExternalSalaryMedian"
    );

  const source =
    document.getElementById(
      "detailExternalSalarySource"
    );

  const verdict =
    document.getElementById(
      "detailExternalSalaryVerdict"
    );

  const note =
    document.getElementById(
      "detailExternalSalaryNote"
    );

  verdict.className = "";

  const market =
    getExternalMarket(player);

  if (
    !market ||
    !market.low ||
    !market.high
  ) {
    range.textContent =
      "未設定";

    middle.textContent =
      "未設定";

    source.textContent =
      "-";

    verdict.textContent =
      "-";

    note.textContent =
      player.marketValue
        ? "この所属リーグのリアル相場データがまだありません。"
        : "市場価値を登録するとリアル参考相場を自動推定できます。";

    return;
  }

  range.textContent =
    `${formatJapaneseMoney(market.low)}〜${formatJapaneseMoney(market.high)}`;

  middle.textContent =
    market.median
      ? formatJapaneseMoney(
          market.median
        )
      : "-";

  source.textContent =
    market.source || "-";

  const result =
    classifySalary(
      player.salary,
      market
    );

  verdict.textContent =
    result.label;

  verdict.className =
    result.className;

  if (market.automatic) {
    note.textContent =
      market.exactSalaryData
        ? "公開されているリーグ市場価値・給与サンプルを基準に、市場価値・年齢・ポジションから推定しています。クラブ差が大きいためレンジは広めです。"
        : "公開データとリーグ階層から作った内蔵参考モデルです。厳密な給与DBではないため、契約判断の目安として使ってください。";
  } else {
    note.textContent =
      "この選手は手動で設定した参考相場を使用しています。";
  }
}

function openExternalMarketModal() {
  if (!selectedPlayerId) {
    alert(
      "外部相場を設定する選手を選択してください"
    );
    return;
  }

  const player =
    players.find(
      item =>
        item.id === selectedPlayerId
    );

  if (!player) {
    return;
  }

  document.getElementById(
    "externalMarketPlayerName"
  ).textContent =
    player.name;

  const market =
    player.externalSalaryMarket || null;

  setMoneyField(
    externalSalaryLow,
    externalSalaryLowUnit,
    market?.low || null
  );

  setMoneyField(
    externalSalaryHigh,
    externalSalaryHighUnit,
    market?.high || null
  );

  setMoneyField(
    externalSalaryMedian,
    externalSalaryMedianUnit,
    market?.median || null
  );

  externalSalarySource.value =
    market?.source || "";

  updateExternalMarketPreview();

  externalMarketModal.classList.remove(
    "hidden"
  );
}

function closeExternalMarketModal() {
  externalMarketModal.classList.add(
    "hidden"
  );
}

function updateExternalMarketPreview() {
  const player =
    players.find(
      item =>
        item.id === selectedPlayerId
    );

  if (!player) {
    externalMarketPreview.textContent =
      "選手を選択してください。";
    return;
  }

  const low =
    moneyInputToNumber(
      externalSalaryLow.value,
      externalSalaryLowUnit.value
    );

  const high =
    moneyInputToNumber(
      externalSalaryHigh.value,
      externalSalaryHighUnit.value
    );

  const middle =
    moneyInputToNumber(
      externalSalaryMedian.value,
      externalSalaryMedianUnit.value
    );

  if (!low || !high) {
    externalMarketPreview.textContent =
      "下限と上限を入力すると比較できます。";
    return;
  }

  if (high < low) {
    externalMarketPreview.textContent =
      "上限は下限以上にしてください。";
    return;
  }

  const market = {
    low,
    high,
    median:
      middle || Math.round(
        (low + high) / 2
      )
  };

  const result =
    classifySalary(
      player.salary,
      market
    );

  externalMarketPreview.textContent =
    `外部参考：${formatJapaneseMoney(low)}〜${formatJapaneseMoney(high)} / 現在年俸 ${formatJapaneseMoney(player.salary)} → ${result.label}`;
}

[
  externalSalaryLow,
  externalSalaryLowUnit,
  externalSalaryHigh,
  externalSalaryHighUnit,
  externalSalaryMedian,
  externalSalaryMedianUnit,
  externalSalarySource
].forEach(element => {
  element.addEventListener(
    "input",
    updateExternalMarketPreview
  );

  element.addEventListener(
    "change",
    updateExternalMarketPreview
  );
});

editExternalMarketButton.addEventListener(
  "click",
  openExternalMarketModal
);

closeExternalMarketModalButton.addEventListener(
  "click",
  closeExternalMarketModal
);

externalMarketModal.addEventListener(
  "click",
  event => {
    if (
      event.target ===
      externalMarketModal
    ) {
      closeExternalMarketModal();
    }
  }
);

saveExternalMarketButton.addEventListener(
  "click",
  () => {
    const playerIndex =
      players.findIndex(
        item =>
          item.id === selectedPlayerId
      );

    if (playerIndex === -1) {
      return;
    }

    const low =
      moneyInputToNumber(
        externalSalaryLow.value,
        externalSalaryLowUnit.value
      );

    const high =
      moneyInputToNumber(
        externalSalaryHigh.value,
        externalSalaryHighUnit.value
      );

    const middle =
      moneyInputToNumber(
        externalSalaryMedian.value,
        externalSalaryMedianUnit.value
      );

    if (!low && !high) {
      players[playerIndex].externalSalaryMarket =
        null;

      savePlayers();
      closeExternalMarketModal();
      refreshCurrentView();
      return;
    }

    if (!low || !high) {
      alert(
        "手動設定する場合は下限と上限の両方を入力してください"
      );
      return;
    }

    if (high < low) {
      alert(
        "外部相場の上限は下限以上にしてください"
      );
      return;
    }

    if (
      middle &&
      (
        middle < low ||
        middle > high
      )
    ) {
      alert(
        "参考中央値は相場レンジ内にしてください"
      );
      return;
    }

    players[playerIndex].externalSalaryMarket = {
      low,
      high,
      median:
        middle || Math.round(
          (low + high) / 2
        ),
      source:
        externalSalarySource.value.trim()
    };

    savePlayers();
    closeExternalMarketModal();
    refreshCurrentView();
  }
);

function median(values) {
  if (!values.length) {
    return null;
  }

  const sorted =
    [...values].sort((a, b) => a - b);

  const middle =
    Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round(
      (sorted[middle - 1] + sorted[middle]) / 2
    );
  }

  return sorted[middle];
}

function percentile(values, p) {
  if (!values.length) {
    return null;
  }

  const sorted =
    [...values].sort((a, b) => a - b);

  const index =
    (sorted.length - 1) * p;

  const lower =
    Math.floor(index);

  const upper =
    Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight =
    index - lower;

  return Math.round(
    sorted[lower] * (1 - weight) +
    sorted[upper] * weight
  );
}

function removeSalaryOutliers(values) {
  if (values.length < 4) {
    return values;
  }

  const q1 =
    percentile(values, 0.25);

  const q3 =
    percentile(values, 0.75);

  const iqr =
    q3 - q1;

  const lower =
    q1 - iqr * 1.5;

  const upper =
    q3 + iqr * 1.5;

  const filtered =
    values.filter(
      value =>
        value >= lower &&
        value <= upper
    );

  return filtered.length >= 3
    ? filtered
    : values;
}

function getComparableScore(target, candidate) {
  let score = 0;

  if (
    candidate.mainPosition ===
    target.mainPosition
  ) {
    score += 4;
  }

  const abilityDiff =
    Math.abs(
      Number(candidate.currentAbilityCertain) -
      Number(target.currentAbilityCertain)
    );

  if (abilityDiff <= 0.5) {
    score += 3;
  } else if (abilityDiff <= 1) {
    score += 1;
  }

  if (
    candidate.playingTime ===
    target.playingTime
  ) {
    score += 2;
  }

  const targetAge =
    getPlayerDisplayAge(target);

  const candidateAge =
    getPlayerDisplayAge(candidate);

  if (
    targetAge !== null &&
    targetAge !== undefined &&
    candidateAge !== null &&
    candidateAge !== undefined &&
    Math.abs(targetAge - candidateAge) <= 3
  ) {
    score += 1;
  }

  return score;
}

function buildSalaryMarket(player) {
  const salariedPlayers =
    players.filter(
      item =>
        item.id !== player.id &&
        Number(item.salary) > 0
    );

  if (salariedPlayers.length === 0) {
    return null;
  }

  const scored =
    salariedPlayers
      .map(candidate => ({
        player: candidate,
        score:
          getComparableScore(
            player,
            candidate
          )
      }))
      .sort(
        (a, b) =>
          b.score - a.score
      );

  let comparables =
    scored
      .filter(item => item.score >= 4)
      .map(item => item.player);

  let basis =
    "近い条件の選手";

  if (comparables.length < 3) {
    comparables =
      salariedPlayers.filter(
        item =>
          item.mainPosition ===
          player.mainPosition
      );

    basis =
      "同じ主戦ポジション";
  }

  if (comparables.length < 3) {
    comparables =
      scored
        .slice(0, Math.min(6, scored.length))
        .map(item => item.player);

    basis =
      "チーム内の近い選手";
  }

  const rawSalaries =
    comparables
      .map(item => Number(item.salary))
      .filter(
        value =>
          Number.isFinite(value) &&
          value > 0
      );

  if (rawSalaries.length === 0) {
    return null;
  }

  const salaries =
    removeSalaryOutliers(
      rawSalaries
    );

  const middle =
    median(salaries);

  let low =
    percentile(salaries, 0.25);

  let high =
    percentile(salaries, 0.75);

  if (
    salaries.length < 4 ||
    low === high
  ) {
    low =
      Math.round(
        middle * 0.9
      );

    high =
      Math.round(
        middle * 1.1
      );
  }

  return {
    low,
    high,
    median: middle,
    count: salaries.length,
    originalCount:
      rawSalaries.length,
    basis,
    outliersRemoved:
      rawSalaries.length -
      salaries.length
  };
}

function classifySalary(
  salary,
  market
) {
  const value =
    Number(salary);

  if (
    !market ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return {
      label: "比較不可",
      className: ""
    };
  }

  if (value < market.low) {
    return {
      label: "相場より低め",
      className:
        "salary-verdict-low"
    };
  }

  if (value <= market.high) {
    return {
      label: "相場内",
      className:
        "salary-verdict-good"
    };
  }

  if (value <= market.high * 1.2) {
    return {
      label: "やや高め",
      className:
        "salary-verdict-warn"
    };
  }

  return {
    label: "かなり高め",
    className:
      "salary-verdict-high"
  };
}

function renderSalaryMarket(player) {
  const range =
    document.getElementById(
      "detailSalaryMarketRange"
    );

  const middle =
    document.getElementById(
      "detailSalaryMarketMedian"
    );

  const count =
    document.getElementById(
      "detailSalaryMarketCount"
    );

  const verdict =
    document.getElementById(
      "detailSalaryMarketVerdict"
    );

  const note =
    document.getElementById(
      "detailSalaryMarketNote"
    );

  const market =
    buildSalaryMarket(player);

  verdict.className = "";

  if (!market) {
    range.textContent = "-";
    middle.textContent = "-";
    count.textContent = "0人";
    verdict.textContent = "比較不可";
    note.textContent =
      "年俸が登録されている比較対象がまだ足りません。";
    return;
  }

  range.textContent =
    `${formatJapaneseMoney(market.low)}〜${formatJapaneseMoney(market.high)}`;

  middle.textContent =
    formatJapaneseMoney(
      market.median
    );

  count.textContent =
    `${market.count}人`;

  const currentVerdict =
    classifySalary(
      player.salary,
      market
    );

  verdict.textContent =
    currentVerdict.label;

  verdict.className =
    currentVerdict.className;

  const outlierNote =
    market.outliersRemoved > 0
      ? ` 明らかな外れ値${market.outliersRemoved}件は相場計算から除外しています。`
      : "";

  const smallSampleNote =
    market.count < 4
      ? " 比較人数が少ないため、目安はやや粗めです。"
      : "";

  note.textContent =
    `${market.basis}を中心に中央値で算出しています。${outlierNote}${smallSampleNote}`;
}

function updateRequestedSalaryVerdict() {
  const player =
    players.find(
      item =>
        item.id === selectedPlayerId
    );

  if (!player) {
    requestedSalaryVerdict.textContent =
      "選手を選択してください。";
    return;
  }

  if (
    requestedSalary.value === ""
  ) {
    requestedSalaryVerdict.textContent =
      "金額を入れると相場と比較します。";
    requestedSalaryVerdict.className =
      "requested-salary-verdict";
    return;
  }

  const amount =
    moneyInputToNumber(
      requestedSalary.value,
      requestedSalaryUnit.value
    );

  const market =
    buildSalaryMarket(player);

  if (
    amount === null ||
    !market
  ) {
    requestedSalaryVerdict.textContent =
      "比較できる相場データがまだ足りません。";
    requestedSalaryVerdict.className =
      "requested-salary-verdict";
    return;
  }

  const result =
    classifySalary(
      amount,
      market
    );

  requestedSalaryVerdict.textContent =
    `${formatJapaneseMoney(amount)} → ${result.label}（目安 ${formatJapaneseMoney(market.low)}〜${formatJapaneseMoney(market.high)}）`;

  requestedSalaryVerdict.className =
    `requested-salary-verdict ${result.className}`;
}

requestedSalary.addEventListener(
  "input",
  updateRequestedSalaryVerdict
);

requestedSalaryUnit.addEventListener(
  "change",
  updateRequestedSalaryVerdict
);

function getPlayingTimeOptionsForPosition(position) {
  return normalizePosition(position) === "GK"
    ? GK_PLAYING_TIME_OPTIONS
    : FIELD_PLAYING_TIME_OPTIONS;
}

function fillContractPlayingTimeOptions(
  position,
  selectedValue
) {
  const options =
    getPlayingTimeOptionsForPosition(position);

  contractNewPlayingTime.innerHTML = "";

  options.forEach(value => {
    const option =
      document.createElement("option");

    option.value = value;
    option.textContent = value;

    contractNewPlayingTime.appendChild(option);
  });

  if (options.includes(selectedValue)) {
    contractNewPlayingTime.value =
      selectedValue;
  }
}

function openContractModal() {
  if (!selectedPlayerId) {
    alert(
      "契約更新する選手を選択してください"
    );
    return;
  }

  const player =
    players.find(
      player =>
        player.id === selectedPlayerId
    );

  if (!player) {
    return;
  }

  document.getElementById(
    "contractPlayerName"
  ).textContent =
    player.name;

  document.getElementById(
    "currentContractSalary"
  ).textContent =
    formatJapaneseMoney(player.salary);

  document.getElementById(
    "currentContractStart"
  ).textContent =
    formatDate(player.contractStart);

  document.getElementById(
    "currentContractEnd"
  ).textContent =
    formatDate(player.contractEnd);

  document.getElementById(
    "currentContractPlayingTime"
  ).textContent =
    player.playingTime || "-";

  document.getElementById(
    "currentContractType"
  ).textContent =
    player.contractType || "-";

  setMoneyField(
    contractNewSalary,
    contractNewSalaryUnit,
    player.salary
  );

  contractNewStart.value =
    getGlobalGameDate() ||
    player.contractStart ||
    "";

  contractNewEnd.value =
    player.contractEnd || "";

  fillContractPlayingTimeOptions(
    player.mainPosition,
    player.playingTime
  );

  contractNewType.value =
    player.contractType || "フルタイム";

  contractUpdateDate.value =
    getGlobalGameDate();

  requestedSalary.value = "";
  requestedSalaryUnit.value = "万";
  updateRequestedSalaryVerdict();

  updateContractPreview();

  contractModal.classList.remove(
    "hidden"
  );
}

function closeContractModal() {
  contractModal.classList.add(
    "hidden"
  );
}

function getSalaryChangePercent(
  oldSalary,
  newSalary
) {
  const oldValue =
    Number(oldSalary);

  const newValue =
    Number(newSalary);

  if (
    !Number.isFinite(oldValue) ||
    !Number.isFinite(newValue) ||
    oldValue <= 0
  ) {
    return null;
  }

  return Math.round(
    ((newValue - oldValue) / oldValue) * 1000
  ) / 10;
}

function updateContractPreview() {
  const player =
    players.find(
      player =>
        player.id === selectedPlayerId
    );

  if (!player) {
    contractChangePreview.textContent =
      "選手を選択してください。";
    return;
  }

  const newSalary =
    moneyInputToNumber(
      contractNewSalary.value,
      contractNewSalaryUnit.value
    );

  const lines = [];

  if (
    newSalary !== null &&
    newSalary !== Number(player.salary)
  ) {
    const percent =
      getSalaryChangePercent(
        player.salary,
        newSalary
      );

    const percentText =
      percent === null
        ? ""
        : `（${percent >= 0 ? "+" : ""}${percent}%）`;

    lines.push(
      `年俸：${formatJapaneseMoney(player.salary)} → ${formatJapaneseMoney(newSalary)} ${percentText}`
    );
  }

  if (
    contractNewStart.value !==
    (player.contractStart || "")
  ) {
    lines.push(
      `契約開始：${formatDate(player.contractStart)} → ${formatDate(contractNewStart.value)}`
    );
  }

  if (
    contractNewEnd.value !==
    (player.contractEnd || "")
  ) {
    lines.push(
      `契約満了：${formatDate(player.contractEnd)} → ${formatDate(contractNewEnd.value)}`
    );
  }

  if (
    contractNewPlayingTime.value !==
    player.playingTime
  ) {
    lines.push(
      `出場要求：${player.playingTime || "-"} → ${contractNewPlayingTime.value}`
    );
  }

  if (
    contractNewType.value.trim() !==
    (player.contractType || "")
  ) {
    lines.push(
      `契約タイプ：${player.contractType || "-"} → ${contractNewType.value.trim() || "-"}`
    );
  }

  contractChangePreview.innerHTML =
    lines.length > 0
      ? lines.map(
          line =>
            `<div>${escapeHtml(line)}</div>`
        ).join("")
      : "現在の契約から変更はありません。";
}

[
  contractNewSalary,
  contractNewSalaryUnit,
  contractNewStart,
  contractNewEnd,
  contractNewPlayingTime,
  contractNewType,
  contractUpdateDate
].forEach(element => {
  element.addEventListener(
    "input",
    updateContractPreview
  );

  element.addEventListener(
    "change",
    updateContractPreview
  );
});

contractUpdateButton.addEventListener(
  "click",
  openContractModal
);

closeContractModalButton.addEventListener(
  "click",
  closeContractModal
);

contractModal.addEventListener(
  "click",
  event => {
    if (event.target === contractModal) {
      closeContractModal();
    }
  }
);

saveContractUpdateButton.addEventListener(
  "click",
  () => {
    const playerIndex =
      players.findIndex(
        player =>
          player.id === selectedPlayerId
      );

    if (playerIndex === -1) {
      return;
    }

    const player =
      players[playerIndex];

    const newSalaryInput =
      contractNewSalary.value;

    const newSalary =
      moneyInputToNumber(
        newSalaryInput,
        contractNewSalaryUnit.value
      );

    if (
      newSalaryInput !== "" &&
      newSalary === null
    ) {
      alert(
        "年俸は0以上の数字で入力してください"
      );
      return;
    }

    const updateDate =
      contractUpdateDate.value;

    if (!updateDate) {
      alert(
        "更新確認日（ゲーム内）を入力してください"
      );
      return;
    }

    const newContractStart =
      contractNewStart.value;

    const newContractEnd =
      contractNewEnd.value;

    if (
      newContractStart &&
      newContractEnd &&
      newContractEnd < newContractStart
    ) {
      alert(
        "契約終了日は契約開始日より後にしてください"
      );
      return;
    }

    const newPlayingTime =
      contractNewPlayingTime.value;

    const newContractType =
      contractNewType.value.trim();

    const percent =
      getSalaryChangePercent(
        player.salary,
        newSalary
      );

    const historyEntry = {
      id:
        crypto.randomUUID(),

      updateDate,

      previousSalary:
        player.salary ?? null,

      newSalary:
        newSalary ?? null,

      salaryChangePercent:
        percent,

      previousContractStart:
        player.contractStart || "",

      newContractStart,

      previousContractEnd:
        player.contractEnd || "",

      newContractEnd,

      previousPlayingTime:
        player.playingTime || "",

      newPlayingTime,

      previousContractType:
        player.contractType || "",

      newContractType
    };

    if (
      !Array.isArray(
        player.contractHistory
      )
    ) {
      player.contractHistory = [];
    }

    player.contractHistory.unshift(
      historyEntry
    );

    player.salary =
      newSalary;

    player.contractStart =
      newContractStart;

    player.contractEnd =
      newContractEnd;

    player.playingTime =
      newPlayingTime;

    player.contractType =
      newContractType;

    player.lastChecked =
      updateDate;

    saveLastCheckedDateDefault(
      updateDate
    );

    players[playerIndex] =
      player;

    savePlayers();
    closeContractModal();
    refreshCurrentView();
  }
);

function openModal() {
  playerModal.classList.remove("hidden");
}

function closeModal() {
  playerModal.classList.add("hidden");
  editingPlayerId = null;
}

playerModal.addEventListener("click", event => {
  if (event.target === playerModal) {
    closeModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") {
    return;
  }

  if (
    !externalMarketModal.classList.contains("hidden")
  ) {
    closeExternalMarketModal();
    return;
  }

  if (
    !contractModal.classList.contains("hidden")
  ) {
    closeContractModal();
    return;
  }

  if (
    !playerModal.classList.contains("hidden")
  ) {
    closeModal();
  }
});

function normalizePosition(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizeSecondaryPositions(value) {
  return value
    .replace(/、/g, ",")
    .replace(/，/g, ",")
    .split(",")
    .map(item =>
      normalizePosition(item)
    )
    .filter(Boolean)
    .join(",");
}

function setPlayingTimeOptions(position, preferredValue = null) {
  const normalizedPosition =
    normalizePosition(position || "");

  const options =
    normalizedPosition === "GK"
      ? GK_PLAYING_TIME_OPTIONS
      : FIELD_PLAYING_TIME_OPTIONS;

  playingTimeSelect.innerHTML = "";

  options.forEach(optionValue => {
    const option =
      document.createElement("option");

    option.value = optionValue;
    option.textContent = optionValue;

    playingTimeSelect.appendChild(option);
  });

  if (
    preferredValue &&
    options.includes(preferredValue)
  ) {
    playingTimeSelect.value =
      preferredValue;
  } else {
    playingTimeSelect.value =
      normalizedPosition === "GK"
        ? "バックアップ"
        : "当落線上の選手";
  }
}

mainPositionInput.addEventListener("input", () => {
  const currentValue =
    playingTimeSelect.value;

  setPlayingTimeOptions(
    mainPositionInput.value,
    currentValue
  );
});

function resetForm() {
  editingPlayerId = null;

  document.getElementById("playerName").value = "";
  setBirthDateParts("");
  document.getElementById("playerAge").value = "";
  document.getElementById("mainPosition").value = "";
  document.getElementById("secondaryPositions").value = "";

  fillAbilitySelect(currentAbilityCertain, 3);
  fillAbilitySelect(currentAbilityMax, 3);
  fillAbilitySelect(potentialAbilityCertain, 3);
  fillAbilitySelect(potentialAbilityMax, 3);

  setPlayingTimeOptions(
    "",
    "当落線上の選手"
  );

  document.getElementById("salary").value = "";
  salaryUnit.value = "万";

  document.getElementById("marketValue").value = "";
  marketValueUnit.value = "万";
  document.getElementById("contractEnd").value = "";
  document.getElementById("lastChecked").value =
    new Date().toISOString().slice(0, 10);
  document.getElementById("contractType").value =
    "フルタイム";
  document.getElementById("memo").value = "";

  selectedDecision = "保留";
  selectedLoanStatus = "none";

  updateDecisionButtons();
  updateLoanButtons();

  document.querySelector(
    ".modal-header h2"
  ).textContent = "選手を新規登録";

  savePlayerButton.textContent = "保存";
}

function getStatusClass(decision) {
  if (decision === "残す") return "keep";
  if (decision === "売却") return "sell";
  if (decision === "レンタル") return "loan";
  return "pending";
}

function getLoanLabel(status) {
  if (status === "loanIn") return "レンタル中";
  if (status === "loanOut") return "レンタル移籍中";
  return "自チーム所属";
}

addPlayerButton.addEventListener("click", () => {
  resetForm();
  openModal();
});

closeModalButton.addEventListener(
  "click",
  closeModal
);

loanInButton.addEventListener("click", () => {
  selectedLoanStatus =
    selectedLoanStatus === "loanIn"
      ? "none"
      : "loanIn";

  updateLoanButtons();
});

loanOutButton.addEventListener("click", () => {
  selectedLoanStatus =
    selectedLoanStatus === "loanOut"
      ? "none"
      : "loanOut";

  updateLoanButtons();
});

function updateLoanButtons() {
  loanInButton.classList.toggle(
    "active",
    selectedLoanStatus === "loanIn"
  );

  loanOutButton.classList.toggle(
    "active",
    selectedLoanStatus === "loanOut"
  );
}

decisionButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectedDecision =
      button.dataset.decision;

    updateDecisionButtons();
  });
});

function updateDecisionButtons() {
  decisionButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.decision ===
        selectedDecision
    );
  });
}

savePlayerButton.addEventListener("click", () => {
  const name =
    document
      .getElementById("playerName")
      .value
      .trim();

  const birthDate =
    syncBirthDateFromParts();

  const ageInput =
    document.getElementById(
      "playerAge"
    ).value;

  const age =
    ageInput
      ? Number(ageInput)
      : null;

  const mainPosition =
    normalizePosition(
      document.getElementById(
        "mainPosition"
      ).value
    );

  const hasBirthParts =
    birthYear.value ||
    birthMonth.value ||
    birthDay.value;

  if (
    hasBirthParts &&
    !birthDate
  ) {
    alert(
      "生年月日を正しく入力してください"
    );
    return;
  }

  if (
    !name ||
    !mainPosition ||
    (!birthDate && !age)
  ) {
    alert(
      "選手名・主戦ポジションと、生年月日または年齢を入力してください"
    );
    return;
  }

  const currentCertain =
    Number(currentAbilityCertain.value);
  const currentMax =
    Number(currentAbilityMax.value);
  const potentialCertain =
    Number(potentialAbilityCertain.value);
  const potentialMax =
    Number(potentialAbilityMax.value);

  if (
    currentMax < currentCertain ||
    potentialMax < potentialCertain
  ) {
    alert(
      "能力の上限は、確定値以上にしてください"
    );
    return;
  }

  const salaryInput =
    document.getElementById("salary").value;

  const marketValueInput =
    document.getElementById("marketValue").value;

  const salaryValue =
    moneyInputToNumber(
      salaryInput,
      salaryUnit.value
    );

  const marketValue =
    moneyInputToNumber(
      marketValueInput,
      marketValueUnit.value
    );

  if (
    salaryInput !== "" &&
    salaryValue === null
  ) {
    alert(
      "年俸は0以上の数字で入力してください"
    );
    return;
  }

  if (
    marketValueInput !== "" &&
    marketValue === null
  ) {
    alert(
      "市場価値は0以上の数字で入力してください"
    );
    return;
  }

  const contractStartValue =
    document.getElementById(
      "contractStart"
    ).value;

  const contractEndValue =
    document.getElementById(
      "contractEnd"
    ).value;

  if (
    contractStartValue &&
    contractEndValue &&
    contractEndValue < contractStartValue
  ) {
    alert(
      "契約終了日は契約開始日より後にしてください"
    );
    return;
  }

  const playerData = {
    name,
    birthDate,
    age,
    mainPosition,

    secondaryPositions:
      normalizeSecondaryPositions(
        document.getElementById(
          "secondaryPositions"
        ).value
      ),

    currentAbilityCertain:
      currentCertain,

    currentAbilityMax:
      currentMax,

    potentialAbilityCertain:
      potentialCertain,

    potentialAbilityMax:
      potentialMax,

    playingTime:
      document.getElementById(
        "playingTime"
      ).value,

    salary:
      salaryValue,

    marketValue:
      marketValue,

    contractStart:
      document.getElementById(
        "contractStart"
      ).value,

    contractEnd:
      document.getElementById(
        "contractEnd"
      ).value,

    lastChecked:
      getGlobalGameDate(),

    contractType:
      document
        .getElementById("contractType")
        .value
        .trim(),

    loanStatus:
      selectedLoanStatus,

    decision:
      selectedDecision,

    memo:
      document
        .getElementById("memo")
        .value
        .trim()
  };

  saveLastCheckedDateDefault(
    playerData.lastChecked
  );

  if (editingPlayerId) {
    const playerIndex =
      players.findIndex(
        player =>
          player.id === editingPlayerId
      );

    if (playerIndex !== -1) {
      players[playerIndex] = {
        ...players[playerIndex],
        ...playerData
      };

      selectedPlayerId =
        editingPlayerId;
    }
  } else {
    const newPlayer = {
      id: crypto.randomUUID(),
      ...playerData
    };

    players.push(newPlayer);

    selectedPlayerId =
      newPlayer.id;
  }

  savePlayers();
  refreshCurrentView();
  closeModal();
});

editPlayerButton.addEventListener("click", () => {
  if (!selectedPlayerId) {
    alert(
      "編集する選手を選択してください"
    );
    return;
  }

  const player =
    players.find(
      player =>
        player.id === selectedPlayerId
    );

  if (!player) return;

  editingPlayerId =
    player.id;

  document.getElementById(
    "playerName"
  ).value =
    player.name;

  setBirthDateParts(
    player.birthDate || ""
  );

  document.getElementById(
    "playerAge"
  ).value =
    player.birthDate
      ? ""
      : (player.age || "");

  document.getElementById(
    "mainPosition"
  ).value =
    player.mainPosition;

  document.getElementById(
    "secondaryPositions"
  ).value =
    player.secondaryPositions || "";

  fillAbilitySelect(
    currentAbilityCertain,
    player.currentAbilityCertain
  );

  fillAbilitySelect(
    currentAbilityMax,
    player.currentAbilityMax
  );

  fillAbilitySelect(
    potentialAbilityCertain,
    player.potentialAbilityCertain
  );

  fillAbilitySelect(
    potentialAbilityMax,
    player.potentialAbilityMax
  );

  setPlayingTimeOptions(
    player.mainPosition,
    player.playingTime
  );

  setMoneyField(
    document.getElementById("salary"),
    salaryUnit,
    player.salary
  );

  setMoneyField(
    document.getElementById("marketValue"),
    marketValueUnit,
    player.marketValue
  );

  document.getElementById(
    "contractStart"
  ).value =
    player.contractStart || "";

  document.getElementById(
    "contractEnd"
  ).value =
    player.contractEnd || "";

  document.getElementById(
    "lastChecked"
  ).value =
    player.lastChecked || "";

  document.getElementById(
    "contractType"
  ).value =
    player.contractType || "フルタイム";

  document.getElementById(
    "memo"
  ).value =
    player.memo || "";

  selectedLoanStatus =
    player.loanStatus || "none";

  selectedDecision =
    player.decision || "保留";

  updateLoanButtons();
  updateDecisionButtons();

  document.querySelector(
    ".modal-header h2"
  ).textContent =
    "選手情報を編集";

  savePlayerButton.textContent =
    "変更を保存";

  openModal();
});

deletePlayerButton.addEventListener("click", () => {
  if (!selectedPlayerId) {
    alert(
      "削除する選手を選択してください"
    );
    return;
  }

  const player =
    players.find(
      player =>
        player.id === selectedPlayerId
    );

  if (!player) return;

  const confirmed =
    confirm(
      `${player.name} を削除しますか？`
    );

  if (!confirmed) return;

  players =
    players.filter(
      item =>
        item.id !== selectedPlayerId
    );

  selectedPlayerId = null;

  savePlayers();
  clearPlayerDetail();
  refreshCurrentView();
});

deleteAllButton.addEventListener("click", () => {
  if (players.length === 0) {
    alert(
      "登録されている選手はいません"
    );
    return;
  }

  const firstConfirm =
    confirm(
      `登録済みの${players.length}人をすべて削除しますか？`
    );

  if (!firstConfirm) return;

  const secondConfirm =
    confirm(
      "本当に全削除しますか？\nこの操作は取り消せません。"
    );

  if (!secondConfirm) return;

  players = [];
  selectedPlayerId = null;

  localStorage.removeItem(
    "fm26Players"
  );

  clearPlayerDetail();
  refreshCurrentView();

  alert(
    "全選手のデータを削除しました"
  );
});

function getSortedPlayers(list) {
  const result = [...list];

  if (currentSort === "salaryDesc") {
    result.sort(
      (a, b) =>
        (Number(b.salary) || 0) -
        (Number(a.salary) || 0)
    );
  }

  if (currentSort === "salaryAsc") {
    result.sort(
      (a, b) => {
        const aSalary =
          Number(a.salary) || Infinity;

        const bSalary =
          Number(b.salary) || Infinity;

        return aSalary - bSalary;
      }
    );
  }

  if (currentSort === "ageAsc") {
    result.sort(
      (a, b) =>
        (getPlayerDisplayAge(a) ?? 999) -
        (getPlayerDisplayAge(b) ?? 999)
    );
  }

  if (currentSort === "ageDesc") {
    result.sort(
      (a, b) =>
        (getPlayerDisplayAge(b) ?? -1) -
        (getPlayerDisplayAge(a) ?? -1)
    );
  }

  if (currentSort === "currentDesc") {
    result.sort(
      (a, b) =>
        (
          Number(b.currentAbilityCertain) -
          Number(a.currentAbilityCertain)
        ) ||
        (
          Number(b.currentAbilityMax) -
          Number(a.currentAbilityMax)
        )
    );
  }

  if (currentSort === "potentialDesc") {
    result.sort(
      (a, b) =>
        (
          Number(b.potentialAbilityCertain) -
          Number(a.potentialAbilityCertain)
        ) ||
        (
          Number(b.potentialAbilityMax) -
          Number(a.potentialAbilityMax)
        )
    );
  }

  if (currentSort === "decision") {
    const order = {
      "残す": 1,
      "保留": 2,
      "レンタル": 3,
      "売却": 4
    };

    result.sort(
      (a, b) =>
        (order[a.decision] || 99) -
        (order[b.decision] || 99)
    );
  }

  return result;
}

function renderPlayers(filter = "ALL") {
  playerTableBody.innerHTML = "";

  const filteredPlayers =
    filter === "ALL"
      ? players
      : players.filter(
          player =>
            player.mainPosition === filter
        );

  const sortedPlayers =
    getSortedPlayers(
      filteredPlayers
    );

  sortedPlayers.forEach(player => {
    const row =
      document.createElement("tr");

    row.className =
      "player-row";

    if (
      player.id ===
      selectedPlayerId
    ) {
      row.classList.add(
        "selected"
      );
    }

    row.innerHTML = `
      <td>${escapeHtml(player.name)}</td>
      <td>${escapeHtml(player.mainPosition)}</td>
      <td>${getPlayerDisplayAge(player) ?? "-"}</td>
      <td>
        <div>
          ${renderAbilityHtml(
            player.currentAbilityCertain,
            player.currentAbilityMax
          )}
        </div>
        <small>
          潜在
          ${renderAbilityHtml(
            player.potentialAbilityCertain,
            player.potentialAbilityMax
          )}
        </small>
      </td>
      <td>${escapeHtml(player.playingTime)}</td>
      <td>${formatJapaneseMoney(player.salary)}</td>
      <td>${escapeHtml(
        calculateContractRemaining(
          player.contractEnd,
          getGlobalGameDate()
        )
      )}</td>
      <td>
        <span class="status ${getStatusClass(player.decision)}">
          ${escapeHtml(player.decision)}
        </span>
      </td>
    `;

    row.addEventListener(
      "click",
      () => {
        selectedPlayerId =
          player.id;

        renderPlayers(
          getActiveFilter()
        );

        showPlayerDetail(
          player
        );
      }
    );

    playerTableBody.appendChild(
      row
    );
  });

  playerCount.textContent =
    `${filteredPlayers.length}人`;
}

function renderPositionSummary() {
  const counts = {};

  players.forEach(player => {
    const position =
      player.mainPosition || "未設定";

    counts[position] =
      (counts[position] || 0) + 1;
  });

  positionSummary.innerHTML = "";

  const positions =
    Object.keys(counts)
      .sort((a, b) =>
        a.localeCompare(b)
      );

  if (positions.length === 0) {
    positionSummary.textContent =
      "まだ選手が登録されていません";
    return;
  }

  positions.forEach(position => {
    const chip =
      document.createElement("span");

    chip.className =
      "position-count-chip";

    chip.innerHTML =
      `${escapeHtml(position)} <strong>${counts[position]}</strong>`;

    positionSummary.appendChild(
      chip
    );
  });
}

function getActiveFilter() {
  return (
    document.querySelector(
      ".filter-button.active"
    )?.dataset.filter
    || "ALL"
  );
}

function getRegisteredPositions() {
  const positions = players
    .map(player => player.mainPosition)
    .filter(Boolean);

  return [...new Set(positions)]
    .sort((a, b) =>
      a.localeCompare(b, "en")
    );
}

function renderFilterButtons() {
  const previousFilter =
    getActiveFilter();

  const positions =
    getRegisteredPositions();

  filterBar.innerHTML = "";

  const allButton =
    document.createElement("button");

  allButton.className =
    "filter-button";

  allButton.dataset.filter =
    "ALL";

  allButton.textContent =
    "ALL";

  filterBar.appendChild(
    allButton
  );

  positions.forEach(position => {
    const button =
      document.createElement("button");

    button.className =
      "filter-button";

    button.dataset.filter =
      position;

    button.textContent =
      position;

    filterBar.appendChild(
      button
    );
  });

  const availableFilters = [
    "ALL",
    ...positions
  ];

  const nextFilter =
    availableFilters.includes(
      previousFilter
    )
      ? previousFilter
      : "ALL";

  const activeButton =
    [...filterBar.querySelectorAll(".filter-button")]
      .find(
        button =>
          button.dataset.filter === nextFilter
      );

  if (activeButton) {
    activeButton.classList.add(
      "active"
    );
  }

  filterBar
    .querySelectorAll(".filter-button")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          filterBar
            .querySelectorAll(".filter-button")
            .forEach(item => {
              item.classList.remove(
                "active"
              );
            });

          button.classList.add(
            "active"
          );

          renderPlayers(
            button.dataset.filter
          );
        }
      );
    });

  return nextFilter;
}

sortSelect.addEventListener("change", () => {
  currentSort =
    sortSelect.value;

  renderPlayers(
    getActiveFilter()
  );
});


globalGameDate.addEventListener(
  "change",
  () => {
    const value =
      globalGameDate.value;

    if (!value) {
      return;
    }

    saveGlobalGameDate(value);
    saveLastCheckedDateDefault(value);

    document.getElementById(
      "lastChecked"
    ).value =
      value;

    refreshCurrentView();
  }
);

globalCountry.addEventListener(
  "change",
  () => {
    populateLeagueOptions();
    saveGlobalLeague();
    updateLeagueDataStatus();
    refreshCurrentView();
  }
);

globalLeague.addEventListener(
  "change",
  () => {
    saveGlobalLeague();
    updateLeagueDataStatus();
    refreshCurrentView();
  }
);



function renderContractHistory(player) {
  contractHistoryList.innerHTML = "";

  const history =
    Array.isArray(player.contractHistory)
      ? player.contractHistory
      : [];

  if (history.length === 0) {
    contractHistoryList.innerHTML =
      '<div class="history-empty">更新履歴はありません</div>';
    return;
  }

  history.forEach(entry => {
    const item =
      document.createElement("div");

    item.className =
      "history-item";

    const salaryPercent =
      entry.salaryChangePercent === null ||
      entry.salaryChangePercent === undefined
        ? ""
        : `（${entry.salaryChangePercent >= 0 ? "+" : ""}${entry.salaryChangePercent}%）`;

    const lines = [];

    if (
      entry.previousSalary !==
      entry.newSalary
    ) {
      lines.push(
        `<div class="history-line history-salary-change">年俸：${escapeHtml(formatJapaneseMoney(entry.previousSalary))} → ${escapeHtml(formatJapaneseMoney(entry.newSalary))} ${escapeHtml(salaryPercent)}</div>`
      );
    }

    if (
      entry.previousContractStart !==
      entry.newContractStart
    ) {
      lines.push(
        `<div class="history-line">契約開始：${escapeHtml(formatDate(entry.previousContractStart))} → ${escapeHtml(formatDate(entry.newContractStart))}</div>`
      );
    }

    if (
      entry.previousContractEnd !==
      entry.newContractEnd
    ) {
      lines.push(
        `<div class="history-line">契約満了：${escapeHtml(formatDate(entry.previousContractEnd))} → ${escapeHtml(formatDate(entry.newContractEnd))}</div>`
      );
    }

    if (
      entry.previousPlayingTime !==
      entry.newPlayingTime
    ) {
      lines.push(
        `<div class="history-line">出場要求：${escapeHtml(entry.previousPlayingTime || "-")} → ${escapeHtml(entry.newPlayingTime || "-")}</div>`
      );
    }

    if (
      entry.previousContractType !==
      entry.newContractType
    ) {
      lines.push(
        `<div class="history-line">契約タイプ：${escapeHtml(entry.previousContractType || "-")} → ${escapeHtml(entry.newContractType || "-")}</div>`
      );
    }

    if (lines.length === 0) {
      lines.push(
        '<div class="history-line">契約内容の記録更新</div>'
      );
    }

    item.innerHTML = `
      <div class="history-date">
        ${escapeHtml(formatDate(entry.updateDate))}
      </div>
      ${lines.join("")}
    `;

    contractHistoryList.appendChild(
      item
    );
  });
}

function showPlayerDetail(player) {
  document.querySelector(
    ".player-detail-panel .position-tag"
  ).textContent =
    player.mainPosition;

  document.querySelector(
    ".player-detail-panel .detail-header h2"
  ).textContent =
    player.name;

  document.getElementById(
    "detailCurrentAbility"
  ).textContent =
    formatAbilityText(
      player.currentAbilityCertain,
      player.currentAbilityMax
    );

  document.getElementById(
    "detailPotentialAbility"
  ).textContent =
    formatAbilityText(
      player.potentialAbilityCertain,
      player.potentialAbilityMax
    );

  document.getElementById(
    "detailPlayingTime"
  ).textContent =
    player.playingTime;

  const displayAge =
    getPlayerDisplayAge(player);

  document.getElementById(
    "detailAge"
  ).textContent =
    displayAge === null ||
    displayAge === undefined
      ? "-"
      : `${displayAge}歳`;

  document.getElementById(
    "detailMainPosition"
  ).textContent =
    player.mainPosition;

  document.getElementById(
    "detailSecondaryPositions"
  ).textContent =
    player.secondaryPositions || "-";

  document.getElementById(
    "detailSalary"
  ).textContent =
    formatJapaneseMoney(
      player.salary
    );

  document.getElementById(
    "detailMarketValue"
  ).textContent =
    formatJapaneseMoney(
      player.marketValue
    );

  document.getElementById(
    "detailContractStart"
  ).textContent =
    formatDate(
      player.contractStart
    );

  document.getElementById(
    "detailContractEnd"
  ).textContent =
    formatDate(
      player.contractEnd
    );

  document.getElementById(
    "detailContractRemaining"
  ).textContent =
    calculateContractRemaining(
      player.contractEnd,
      getGlobalGameDate()
    );

  document.getElementById(
    "detailLastChecked"
  ).textContent =
    formatDate(
      player.lastChecked ||
      getGlobalGameDate()
    );

  document.getElementById(
    "detailContractType"
  ).textContent =
    player.contractType || "-";

  document.getElementById(
    "detailLoanStatus"
  ).textContent =
    getLoanLabel(
      player.loanStatus
    );

  document.getElementById(
    "detailDecision"
  ).textContent =
    player.decision;

  document.getElementById(
    "detailMemo"
  ).textContent =
    player.memo || "-";

  renderSalaryMarket(
    player
  );

  renderExternalSalaryMarket(
    player
  );

  renderContractHistory(
    player
  );

  updateAdvice(player);
}

function clearPlayerDetail() {
  document.querySelector(
    ".player-detail-panel .position-tag"
  ).textContent = "-";

  document.querySelector(
    ".player-detail-panel .detail-header h2"
  ).textContent =
    "選手を選択してください";

  document.getElementById("detailCurrentAbility").textContent = "-";
  document.getElementById("detailPotentialAbility").textContent = "-";
  document.getElementById("detailPlayingTime").textContent = "-";
  document.getElementById("detailAge").textContent = "-";
  document.getElementById("detailMainPosition").textContent = "-";
  document.getElementById("detailSecondaryPositions").textContent = "-";
  document.getElementById("detailSalary").textContent = "-";
  document.getElementById("detailMarketValue").textContent = "-";
  document.getElementById("detailContractStart").textContent = "-";
  document.getElementById("detailContractEnd").textContent = "-";
  document.getElementById("detailContractRemaining").textContent = "-";
  document.getElementById("detailLastChecked").textContent = "-";
  document.getElementById("detailContractType").textContent = "-";
  document.getElementById("detailLoanStatus").textContent =
    "自チーム所属";
  document.getElementById("detailDecision").textContent = "-";
  document.getElementById("detailMemo").textContent = "-";

  document.getElementById(
    "detailSalaryMarketRange"
  ).textContent = "-";

  document.getElementById(
    "detailSalaryMarketMedian"
  ).textContent = "-";

  document.getElementById(
    "detailSalaryMarketCount"
  ).textContent = "-";

  document.getElementById(
    "detailSalaryMarketVerdict"
  ).textContent = "-";

  document.getElementById(
    "detailSalaryMarketVerdict"
  ).className = "";

  document.getElementById(
    "detailSalaryMarketNote"
  ).textContent =
    "選手を選択すると相場を表示します。";

  document.getElementById(
    "detailExternalSalaryRange"
  ).textContent = "未設定";

  document.getElementById(
    "detailExternalSalaryMedian"
  ).textContent = "未設定";

  document.getElementById(
    "detailExternalSalarySource"
  ).textContent = "-";

  document.getElementById(
    "detailExternalSalaryVerdict"
  ).textContent = "-";

  document.getElementById(
    "detailExternalSalaryVerdict"
  ).className = "";

  document.getElementById(
    "detailExternalSalaryNote"
  ).textContent =
    "市場価値と所属リーグからリアル参考相場を自動推定します。";

  contractHistoryList.innerHTML =
    '<div class="history-empty">更新履歴はありません</div>';

  document.getElementById("detailAdviceTitle").textContent = "-";
  document.getElementById("detailAdviceText").textContent =
    "選手を選択すると判断材料が表示されます。";
}

function getAverageSalary(positionPlayers) {
  const salaries =
    positionPlayers
      .map(player =>
        Number(player.salary)
      )
      .filter(
        salary =>
          Number.isFinite(salary) &&
          salary > 0
      );

  if (salaries.length === 0) {
    return null;
  }

  return Math.round(
    salaries.reduce(
      (sum, salary) =>
        sum + salary,
      0
    ) / salaries.length
  );
}

function isHeavyPlayingTimeDemand(player) {
  return [
    "スター選手",
    "重要な選手",
    "先発レギュラー",
    "正ゴールキーパー"
  ].includes(
    player.playingTime
  );
}

function updateAdvice(player) {
  const samePositionPlayers =
    players.filter(
      item =>
        item.mainPosition ===
        player.mainPosition
    );

  const sorted =
    [...samePositionPlayers]
      .sort(
        (a, b) =>
          (
            b.currentAbilityCertain -
            a.currentAbilityCertain
          ) ||
          (
            b.currentAbilityMax -
            a.currentAbilityMax
          )
      );

  const rank =
    sorted.findIndex(
      item =>
        item.id === player.id
    ) + 1;

  const averageSalary =
    getAverageSalary(
      samePositionPlayers
    );

  const playerSalary =
    Number(player.salary);

  const salaryRatio =
    averageSalary &&
    Number.isFinite(playerSalary) &&
    playerSalary > 0
      ? playerSalary / averageSalary
      : null;

  const crowded =
    samePositionPlayers.length >= 3 &&
    rank >= 3;

  const playerAge =
    getPlayerDisplayAge(player);

  const developmentCandidate =
    playerAge !== null &&
    playerAge !== undefined &&
    playerAge <= 21 &&
    player.potentialAbilityMax >
      player.currentAbilityCertain;

  const highSalaryBurden =
    salaryRatio !== null &&
    salaryRatio >= 1.35 &&
    rank >= 2;

  const playingTimeMismatch =
    rank >= 3 &&
    isHeavyPlayingTimeDemand(
      player
    );

  const uncertainPotential =
    player.potentialAbilityMax >
    player.potentialAbilityCertain;

  const title =
    document.getElementById(
      "detailAdviceTitle"
    );

  const text =
    document.getElementById(
      "detailAdviceText"
    );

  const notes = [];

  if (crowded) {
    notes.push(
      `主戦ポジション ${player.mainPosition} には${samePositionPlayers.length}人いて、現在能力は${rank}番手です。`
    );
  }

  if (playingTimeMismatch) {
    notes.push(
      `現在の出場要求は「${player.playingTime}」なので、序列とのズレが出る可能性があります。`
    );
  }

  if (highSalaryBurden) {
    notes.push(
      `年俸は同ポジション平均の約${Math.round(salaryRatio * 100)}％です。能力順位との釣り合いは確認した方がよさそうです。`
    );
  }

  if (developmentCandidate) {
    notes.push(
      "若く、潜在能力の上限が現在能力を上回っているため、育成余地があります。"
    );
  }

  if (uncertainPotential) {
    notes.push(
      `潜在能力は確定★${player.potentialAbilityCertain}〜上限★${player.potentialAbilityMax}で、まだ評価に幅があります。`
    );
  }

  if (highSalaryBurden) {
    title.textContent =
      "給与負担大きめ";
  } else if (
    crowded ||
    playingTimeMismatch
  ) {
    title.textContent =
      "競争が激しい";
  } else if (
    developmentCandidate
  ) {
    title.textContent =
      "育成向き";
  } else {
    title.textContent =
      "特に大きな問題なし";
  }

  if (notes.length > 0) {
    text.textContent =
      notes.join(" ");
  } else {
    const salaryNote =
      averageSalary
        ? `同ポジション平均年俸は${formatJapaneseMoney(averageSalary)}です。`
        : "年俸比較に必要なデータはまだ十分ではありません。";

    text.textContent =
      `現時点では強い整理要因は見当たりません。${salaryNote} 出場要求や編成全体を見ながら判断してください。`;
  }
}

function refreshCurrentView() {
  renderPositionSummary();

  const filter =
    renderFilterButtons();

  renderPlayers(filter);

  const selectedPlayer =
    players.find(
      player =>
        player.id ===
        selectedPlayerId
    );

  if (selectedPlayer) {
    showPlayerDetail(
      selectedPlayer
    );
  } else {
    clearPlayerDetail();
  }
}

function formatDate(value) {
  if (!value) return "-";

  const parts =
    value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return (
    `${parts[0]}/` +
    `${parts[1]}/` +
    `${parts[2]}`
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* 古い能力データを新形式へ自動移行 */

function showAuthMessage(
  message,
  state = ""
) {
  authMessage.textContent =
    message;

  authMessage.className =
    `auth-message ${state}`.trim();
}

async function loadCloudData() {
  if (!currentUser) {
    return;
  }

  isLoadingRemote = true;

  try {
    setCloudStatus(
      "☁ 読み込み中…",
      "syncing"
    );

    const localPlayers =
      Array.isArray(players)
        ? [...players]
        : [];

    const {
      data: remoteRows,
      error: playersError
    } =
      await supabaseClient
        .from("fm26_players")
        .select(
          "id, data, created_at"
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );

    if (playersError) {
      throw playersError;
    }

    if (
      remoteRows &&
      remoteRows.length > 0
    ) {
      players =
        remoteRows
          .map(row => ({
            ...row.data,
            id: row.id
          }))
          .sort(
            (a, b) =>
              Number(
                a._syncOrder ?? 999999
              ) -
              Number(
                b._syncOrder ?? 999999
              )
          )
          .map(player => {
            const copy =
              { ...player };

            delete copy._syncOrder;

            return copy;
          });

      localStorage.setItem(
        "fm26Players",
        JSON.stringify(players)
      );
    } else if (
      localPlayers.length > 0
    ) {
      players =
        localPlayers;

      isLoadingRemote = false;

      await syncAllToCloud();

      isLoadingRemote = true;
    }

    const {
      data: setting,
      error: settingError
    } =
      await supabaseClient
        .from("fm26_settings")
        .select(
          "game_date, country, league"
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .maybeSingle();

    if (settingError) {
      throw settingError;
    }

    if (setting) {
      if (setting.game_date) {
        localStorage.setItem(
          "fm26GlobalGameDate",
          setting.game_date
        );

        localStorage.setItem(
          "fm26LastCheckedDate",
          setting.game_date
        );

        globalGameDate.value =
          setting.game_date;
      }

      if (
        setting.country &&
        LEAGUE_CATALOG[
          setting.country
        ]
      ) {
        globalCountry.value =
          setting.country;

        populateLeagueOptions(
          setting.league
        );

        localStorage.setItem(
          "fm26GlobalCountry",
          setting.country
        );

        localStorage.setItem(
          "fm26GlobalLeague",
          globalLeague.value
        );
      }
    } else {
      isLoadingRemote = false;

      await syncSettingsToCloud();

      isLoadingRemote = true;
    }

    selectedPlayerId =
      players[0]?.id || null;

    renderPositionSummary();
    renderFilterButtons();
    renderPlayers();

    if (selectedPlayerId) {
      const selected =
        players.find(
          player =>
            player.id ===
            selectedPlayerId
        );

      if (selected) {
        showPlayerDetail(
          selected
        );
      }
    } else {
      clearPlayerDetail();
    }

    updateLeagueDataStatus();

    setCloudStatus(
      "☁ 同期済み",
      "synced"
    );
  } catch (error) {
    console.error(error);

    setCloudStatus(
      "☁ 読み込みエラー",
      "error"
    );

    alert(
      "Supabaseからデータを読み込めませんでした。\n" +
      (error.message || error)
    );
  } finally {
    isLoadingRemote = false;
  }
}

async function handleSignedIn(user) {
  currentUser = user;

  authOverlay.classList.add(
    "hidden"
  );

  await loadCloudData();
}

signInButton.addEventListener(
  "click",
  async () => {
    const email =
      authEmail.value.trim();

    const password =
      authPassword.value;

    if (!email || !password) {
      showAuthMessage(
        "メールアドレスとパスワードを入力してください。",
        "error"
      );
      return;
    }

    showAuthMessage(
      "ログイン中…"
    );

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });

    if (error) {
      showAuthMessage(
        error.message,
        "error"
      );
      return;
    }

    showAuthMessage(
      "ログインしました。",
      "success"
    );

    await handleSignedIn(
      data.user
    );
  }
);

signUpButton.addEventListener(
  "click",
  async () => {
    const email =
      authEmail.value.trim();

    const password =
      authPassword.value;

    if (!email || password.length < 6) {
      showAuthMessage(
        "メールアドレスと6文字以上のパスワードを入力してください。",
        "error"
      );
      return;
    }

    showAuthMessage(
      "アカウント作成中…"
    );

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signUp({
          email,
          password
        });

    if (error) {
      showAuthMessage(
        error.message,
        "error"
      );
      return;
    }

    if (data.session) {
      showAuthMessage(
        "登録しました。",
        "success"
      );

      await handleSignedIn(
        data.user
      );
    } else {
      showAuthMessage(
        "登録しました。確認メールが届いた場合は、メール内のリンクを押してからログインしてください。",
        "success"
      );
    }
  }
);

signOutButton.addEventListener(
  "click",
  async () => {
    await supabaseClient.auth
      .signOut();

    currentUser = null;

    setCloudStatus(
      "☁ 未ログイン"
    );

    authOverlay.classList.remove(
      "hidden"
    );
  }
);

supabaseClient.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {
    if (
      event === "SIGNED_IN" &&
      session?.user &&
      currentUser?.id !==
        session.user.id
    ) {
      await handleSignedIn(
        session.user
      );
    }

    if (
      event === "SIGNED_OUT"
    ) {
      currentUser = null;

      authOverlay.classList.remove(
        "hidden"
      );
    }
  }
);

async function initializeSupabaseAuth() {
  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth
      .getSession();

  if (session?.user) {
    await handleSignedIn(
      session.user
    );
  } else {
    setCloudStatus(
      "☁ ログイン待ち"
    );

    authOverlay.classList.remove(
      "hidden"
    );
  }
}

players = players.map(player => {
  const converted = {
    ...player
  };

  if (
    typeof converted.salary ===
    "string"
  ) {
    converted.salary =
      parseJapaneseMoney(
        converted.salary
      );
  }

  if (
    typeof converted.marketValue ===
    "string"
  ) {
    converted.marketValue =
      parseJapaneseMoney(
        converted.marketValue
      );
  }

  const oldCurrent =
    Number(converted.currentAbility);

  const oldPotential =
    Number(converted.potentialAbility);

  if (
    converted.currentAbilityCertain ===
    undefined
  ) {
    converted.currentAbilityCertain =
      Number.isFinite(oldCurrent)
        ? oldCurrent
        : 3;
  }

  if (
    converted.currentAbilityMax ===
    undefined
  ) {
    converted.currentAbilityMax =
      converted.currentAbilityCertain;
  }

  if (
    converted.potentialAbilityCertain ===
    undefined
  ) {
    converted.potentialAbilityCertain =
      Number.isFinite(oldPotential)
        ? oldPotential
        : 3;
  }

  if (
    converted.potentialAbilityMax ===
    undefined
  ) {
    converted.potentialAbilityMax =
      converted.potentialAbilityCertain;
  }

  if (
    converted.birthDate === undefined
  ) {
    converted.birthDate = "";
  }

  if (
    converted.contractStart === undefined
  ) {
    converted.contractStart = "";
  }

  if (
    converted.externalSalaryMarket ===
    undefined
  ) {
    converted.externalSalaryMarket = null;
  }

  if (
    !Array.isArray(
      converted.contractHistory
    )
  ) {
    converted.contractHistory = [];
  }

  return converted;
});

savePlayers();

const savedGlobalDate =
  getGlobalGameDate();

if (savedGlobalDate) {
  globalGameDate.value =
    savedGlobalDate;
}

const savedGlobalCountry =
  localStorage.getItem(
    "fm26GlobalCountry"
  );

const savedGlobalLeague =
  localStorage.getItem(
    "fm26GlobalLeague"
  );

populateCountryOptions();

if (
  savedGlobalCountry &&
  LEAGUE_CATALOG[
    savedGlobalCountry
  ]
) {
  globalCountry.value =
    savedGlobalCountry;
} else {
  globalCountry.value =
    "Germany";
}

populateLeagueOptions(
  savedGlobalLeague || "3-liga"
);

updateLeagueDataStatus();

fillAbilitySelect(
  currentAbilityCertain,
  3
);

fillAbilitySelect(
  currentAbilityMax,
  3
);

fillAbilitySelect(
  potentialAbilityCertain,
  3
);

fillAbilitySelect(
  potentialAbilityMax,
  3
);

setPlayingTimeOptions(
  "",
  "当落線上の選手"
);

renderPositionSummary();
renderFilterButtons();
renderPlayers();

if (players.length > 0) {
  selectedPlayerId =
    players[0].id;

  showPlayerDetail(
    players[0]
  );

  renderPlayers();
}


initializeSupabaseAuth();
