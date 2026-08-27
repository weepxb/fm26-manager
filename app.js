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
  "有望選手",
  "若手",
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

