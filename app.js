const STORAGE_KEY = "weather-trump-deck-order";
const DOUBLE_TAP_DELAY = 260;
const SHUFFLE_DURATION = 2000;

const SUITS = [
  { key: "hare", label: "日本晴れ", symbol: "晴", className: "sunny" },
  { key: "ame", label: "雨", symbol: "雨", className: "rainy" },
  { key: "suna", label: "砂嵐", symbol: "砂", className: "sandy" },
  { key: "are", label: "霰", symbol: "霰", className: "hail" },
];

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const deckSlot = document.getElementById("revealedCardSlot");
const interactionZone = document.getElementById("interactionZone");
const statusMessage = document.getElementById("statusMessage");
const storageMessage = document.getElementById("storageMessage");

let currentDeck = [];
let currentCard = null;
let isShuffling = false;
let singleTapTimer = null;
let lastTapTime = 0;

const storage = createStorageHandler();

initialize();

function initialize() {
  currentDeck = restoreDeck() ?? createShuffledDeck();
  persistDeck(currentDeck);
  render();
  bindEvents();

  if (!storage.available) {
    storageMessage.hidden = false;
    storageMessage.textContent =
      "localStorageが使えないため、このページを閉じると山札順は保持されません。";
  }
}

function bindEvents() {
  interactionZone.addEventListener("click", handleTap);
  interactionZone.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleSingleAction();
  });
}

function handleTap() {
  if (isShuffling) {
    return;
  }

  const now = Date.now();
  const isDoubleTap = now - lastTapTime < DOUBLE_TAP_DELAY;
  lastTapTime = now;

  if (isDoubleTap) {
    window.clearTimeout(singleTapTimer);
    singleTapTimer = null;
    startShuffle();
    return;
  }

  singleTapTimer = window.setTimeout(() => {
    handleSingleAction();
    singleTapTimer = null;
  }, DOUBLE_TAP_DELAY);
}

function handleSingleAction() {
  if (isShuffling || currentCard) {
    if (currentCard) {
      statusMessage.textContent = "表示中のカードは固定です。2回タップで新しくシャッフルします。";
    }
    return;
  }

  currentCard = currentDeck[0];
  statusMessage.textContent = `${formatCardName(currentCard)} を表示しています。2回タップで再シャッフルできます。`;
  render();
}

function startShuffle() {
  if (isShuffling) {
    return;
  }

  isShuffling = true;
  currentCard = null;
  interactionZone.classList.add("is-shuffling");
  statusMessage.textContent = "シャッフル中です...";
  render();

  window.setTimeout(() => {
    currentDeck = createShuffledDeck();
    persistDeck(currentDeck);
    isShuffling = false;
    interactionZone.classList.remove("is-shuffling");
    statusMessage.textContent = "シャッフルが完了しました。1回タップで一番上のカードを見られます。";
    render();
  }, SHUFFLE_DURATION);
}

function restoreDeck() {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== 52) {
      return null;
    }

    const validIds = new Set(createOrderedDeck().map((card) => card.id));
    const hasAllCards = parsed.every((id) => validIds.has(id)) && new Set(parsed).size === 52;
    if (!hasAllCards) {
      return null;
    }

    const cardsById = new Map(createOrderedDeck().map((card) => [card.id, card]));
    return parsed.map((id) => cardsById.get(id));
  } catch {
    return null;
  }
}

function persistDeck(deck) {
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify(deck.map((card) => card.id)),
  );
}

function createOrderedDeck() {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${suit.key}_${rank}`,
      suitKey: suit.key,
      suitLabel: suit.label,
      suitSymbol: suit.symbol,
      className: suit.className,
      rank,
    })),
  );
}

function createShuffledDeck() {
  const deck = createOrderedDeck();

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}

function render() {
  deckSlot.classList.toggle("is-empty", currentCard === null);

  if (!currentCard) {
    deckSlot.innerHTML = '<p class="placeholder">1回タップでここにカードが表示されます</p>';
    return;
  }

  deckSlot.innerHTML = buildCardMarkup(currentCard);
}

function buildCardMarkup(card) {
  const displayRank = getDisplayRank(card.rank);

  return `
    <article class="playing-card ${card.className}" aria-label="${formatCardName(card)}">
      <div class="card-corner top-left">
        <span class="corner-rank">${displayRank}</span>
      </div>
      <div class="card-center">
        <div class="card-art ${card.className}" aria-hidden="true"></div>
      </div>
      <div class="card-corner bottom-right">
        <span class="corner-rank">${displayRank}</span>
      </div>
    </article>
  `;
}

function formatCardName(card) {
  return `${card.suitLabel}の${card.rank}`;
}

function getDisplayRank(rank) {
  if (rank === "A") {
    return "1";
  }

  if (rank === "J") {
    return "11";
  }

  if (rank === "Q") {
    return "12";
  }

  if (rank === "K") {
    return "13";
  }

  return rank;
}

function createStorageHandler() {
  try {
    const testKey = "__weather-trump-test__";
    window.localStorage.setItem(testKey, "ok");
    window.localStorage.removeItem(testKey);

    return {
      available: true,
      getItem(key) {
        return window.localStorage.getItem(key);
      },
      setItem(key, value) {
        window.localStorage.setItem(key, value);
      },
    };
  } catch {
    const memoryStore = new Map();
    return {
      available: false,
      getItem(key) {
        return memoryStore.has(key) ? memoryStore.get(key) : null;
      },
      setItem(key, value) {
        memoryStore.set(key, value);
      },
    };
  }
}
