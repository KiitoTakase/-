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

const FACE_COPY = {
  J: "Jack",
  Q: "Queen",
  K: "King",
};

const PIP_LAYOUTS = {
  A: [{ x: 50, y: 50, rotate: false }],
  2: [
    { x: 50, y: 22, rotate: false },
    { x: 50, y: 78, rotate: true },
  ],
  3: [
    { x: 50, y: 20, rotate: false },
    { x: 50, y: 50, rotate: false },
    { x: 50, y: 80, rotate: true },
  ],
  4: [
    { x: 30, y: 24, rotate: false },
    { x: 70, y: 24, rotate: false },
    { x: 30, y: 76, rotate: true },
    { x: 70, y: 76, rotate: true },
  ],
  5: [
    { x: 30, y: 24, rotate: false },
    { x: 70, y: 24, rotate: false },
    { x: 50, y: 50, rotate: false },
    { x: 30, y: 76, rotate: true },
    { x: 70, y: 76, rotate: true },
  ],
  6: [
    { x: 30, y: 22, rotate: false },
    { x: 70, y: 22, rotate: false },
    { x: 30, y: 50, rotate: false },
    { x: 70, y: 50, rotate: false },
    { x: 30, y: 78, rotate: true },
    { x: 70, y: 78, rotate: true },
  ],
  7: [
    { x: 30, y: 20, rotate: false },
    { x: 70, y: 20, rotate: false },
    { x: 50, y: 34, rotate: false },
    { x: 30, y: 50, rotate: false },
    { x: 70, y: 50, rotate: false },
    { x: 30, y: 80, rotate: true },
    { x: 70, y: 80, rotate: true },
  ],
  8: [
    { x: 30, y: 18, rotate: false },
    { x: 70, y: 18, rotate: false },
    { x: 30, y: 38, rotate: false },
    { x: 70, y: 38, rotate: false },
    { x: 30, y: 62, rotate: true },
    { x: 70, y: 62, rotate: true },
    { x: 30, y: 82, rotate: true },
    { x: 70, y: 82, rotate: true },
  ],
  9: [
    { x: 30, y: 18, rotate: false },
    { x: 70, y: 18, rotate: false },
    { x: 30, y: 36, rotate: false },
    { x: 70, y: 36, rotate: false },
    { x: 50, y: 50, rotate: false },
    { x: 30, y: 64, rotate: true },
    { x: 70, y: 64, rotate: true },
    { x: 30, y: 82, rotate: true },
    { x: 70, y: 82, rotate: true },
  ],
  10: [
    { x: 30, y: 16, rotate: false },
    { x: 70, y: 16, rotate: false },
    { x: 30, y: 32, rotate: false },
    { x: 70, y: 32, rotate: false },
    { x: 50, y: 44, rotate: false },
    { x: 50, y: 56, rotate: true },
    { x: 30, y: 68, rotate: true },
    { x: 70, y: 68, rotate: true },
    { x: 30, y: 84, rotate: true },
    { x: 70, y: 84, rotate: true },
  ],
};

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
  const isFaceCard = ["J", "Q", "K"].includes(card.rank);
  const centerMarkup = isFaceCard ? buildFaceMarkup(card) : buildPipMarkup(card);

  return `
    <article class="playing-card ${card.className}" aria-label="${formatCardName(card)}">
      <div class="card-corner top-left">
        <span class="corner-rank">${card.rank}</span>
        <span class="corner-suit">${card.suitSymbol}</span>
      </div>
      <div class="card-center">
        ${centerMarkup}
      </div>
      <div class="card-corner bottom-right">
        <span class="corner-rank">${card.rank}</span>
        <span class="corner-suit">${card.suitSymbol}</span>
      </div>
    </article>
  `;
}

function buildPipMarkup(card) {
  const pips = PIP_LAYOUTS[card.rank]
    .map(
      (pip) => `
        <span
          class="pip"
          style="left:${pip.x}%; top:${pip.y}%; ${pip.rotate ? "transform: translate(-50%, -50%) rotate(180deg);" : ""}"
        >
          <span class="pip-symbol">${card.suitSymbol}</span>
          <span class="pip-rank">${card.rank}</span>
        </span>
      `,
    )
    .join("");

  return `<div class="pip-field">${pips}</div>`;
}

function buildFaceMarkup(card) {
  return `
    <div class="face-center">
      <div class="face-ornament">${card.suitSymbol}</div>
      <div class="face-badge">${card.rank}</div>
      <div class="face-title">
        <strong>${card.suitLabel}</strong>
        <span>${FACE_COPY[card.rank]}</span>
      </div>
      <div class="face-ornament">${card.suitSymbol}</div>
    </div>
  `;
}

function formatCardName(card) {
  return `${card.suitLabel}の${card.rank}`;
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
