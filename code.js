import { select } from "https://cdn.skypack.dev/d3-selection@3";
import { color, hcl } from "https://cdn.skypack.dev/d3-color@3";
import {
  piecewise,
  interpolateRgb,
} from "https://cdn.skypack.dev/d3-interpolate@3";
const d3 = { select, color, hcl, piecewise, interpolateRgb };

const colorPalette = d3.piecewise(d3.interpolateRgb.gamma(2.2), [
  "#0E21A0",
  "#4D2DB7",
  "#9D44C0",
  "#EC53B0",
  "#F57B55",
  "#FFDB5A",
]);

class WorkerPool {
  constructor(size) {
    this.workers = [];
    this.size = size;
    this.init();
  }
  get size() {
    return this._size;
  }
  set size(size) {
    this._size = size;
  }
  init() {
    for (let i = 0; i < this.size; i++) {
      this.workers.push({
        worker: new Worker("./llama2c.worker.js", { type: "module" }),
        inUse: false,
        id: window.crypto.randomUUID(),
      });
    }
  }

  getWorker() {
    return new Promise((resolve) => {
      const check = () => {
        for (let worker of this.workers) {
          if (!worker.inUse) {
            worker.inUse = true;
            resolve(worker.worker);
            return;
          }
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  releaseWorker(worker) {
    this.workers.find((w) => w.worker === worker).inUse = false;
  }
}

// base url for audio examples
const MODELS_BASE_URL =
  "https://huggingface.co/karpathy/tinyllamas/resolve/main";

// models base url
const MODELS = {
  stories15M: {
    url: "stories15M.bin",
    seq_len: 256,
  },
  stories42M: {
    url: "stories42M.bin",
    seq_len: 1024,
  },
  stories110M: {
    url: "stories110M.bin",
    seq_len: 1024,
  },
};

const workerPool = new WorkerPool(window.navigator.hardwareConcurrency);
async function generateSequence({
  worker,
  prompt,
  weightsURL,
  modelID,
  maxSeqLen,
  temp,
  repeatPenalty,
  contentEl,
  controller,
}) {
  return new Promise((resolve, reject) => {
    const seed = BigInt(
      `0x${
        Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16) +
        Date.now().toString(16)
      }`
    );
    worker.postMessage({
      weightsURL,
      modelID,
      tokenizerURL: "tokenizer.json",
      prompt,
      temp,
      repeatPenalty,
      seed: seed,
      maxSeqLen,
      command: "start",
    });

    function handleAbort() {
      worker.postMessage({ command: "abort" });
    }
    function updateStatus(data) {
      if (data.status === "loading") {
        contentEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-dasharray="15" stroke-dashoffset="15" stroke-linecap="round" stroke-width="2" d="M12 3a9 9 0 0 1 9 9"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" values="15;0"/><animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></path></svg>`;
      }
      if (data.status === "aborted") {
        contentEl.innerHTML = ``;
      }
      if (data.status === "generating") {
        const { message, prompt, sentence, tokensSec, totalTime } = data;
        contentEl.innerHTML = `<span>${prompt}</span>
        ${sentence.replace(/\<s\>|\<\/s\>/g, "")}`;
      }
    }
    const handleMessage = (event) => {
      const { status, error } = event.data;
      if (status) updateStatus(event.data);
      if (error) reject(new Error(error));
      if (status === "complete" || status === "aborted") {
        workerPool.releaseWorker(worker);
        resolve(event.data);
      }
    };
    controller.signal.addEventListener("abort", handleAbort);
    worker.addEventListener("message", handleMessage);
  });
}

async function initWorkers() {
  const containerEl = d3.select("#container");
  d3.select("#model").on("input", (e) => {
    const model = MODELS[e.target.value];
    d3.select("#max-seq").property("max", model.seq_len);
  });
  const containers = await Promise.all(
    workerPool.workers.map(async (_, i) => {
      const contentEl = d3.select(document.createElement("div"));

      contentEl.on("pointerover", (e) => {
        e.currentTarget.classList.add("c-hover");
      });
      contentEl.on("pointerdown", (e) => {
        e.currentTarget.classList.toggle("c-hover");
      });

      contentEl.on("pointerout pointercancel pointerleave", (e) => {
        e.currentTarget.classList.remove("c-hover");
      });

      const bgColor = colorPalette(i / workerPool.size);
      const fontColor = d3.hcl(bgColor).l < 50 ? "#fff" : "#000";
      contentEl
        .style("background-color", bgColor)
        .style("color", fontColor)
        .style("grid-row-start", `${i + 1}`)
        .classed("c-block ", true);
      containerEl.append(() => contentEl.node());
      return [contentEl.node(), await workerPool.getWorker()];
    })
  );
  return containers;
}

async function fetchArrayBuffer(url) {
  const cacheName = "llama2c-candle-cache";
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(url);
  if (cachedResponse) {
    const data = await cachedResponse.arrayBuffer();
    return new Uint8Array(data);
  }
  const res = await fetch(url, { cache: "force-cache" });
  cache.put(url, res.clone());
  return new Uint8Array(await res.arrayBuffer());
}

async function run(containers, controller) {
  const getValue = (e) => e.value;
  const prompt = document.querySelector("#prompt");
  const maxSeqLen = document.querySelector("#max-seq");
  const temp = document.querySelector("#temperature");
  const repeatPenalty = document.querySelector("#repeat-penalty");
  const modelID = document.querySelector("#model");

  const weightsURL = `${MODELS_BASE_URL}/${MODELS[getValue(modelID)].url}`;
  maxSeqLen.disabled = true;
  temp.disabled = true;
  repeatPenalty.disabled = true;
  modelID.disabled = true;

  // pre fetch and cache weights and tokenizer
  await Promise.all([
    fetchArrayBuffer(weightsURL),
    fetchArrayBuffer(`tokenizer.json`),
  ]);
  await Promise.all(
    containers.map(([container, worker]) =>
      generateSequence({
        worker,
        prompt: getValue(prompt),
        weightsURL,
        modelID: getValue(modelID),
        maxSeqLen: getValue(maxSeqLen),
        temp: getValue(temp),
        repeatPenalty: getValue(repeatPenalty),
        contentEl: container,
        controller,
      })
    )
  );
  maxSeqLen.disabled = false;
  temp.disabled = false;
  repeatPenalty.disabled = false;
  modelID.disabled = false;
}

initWorkers().then((containers) => {
  const runBtn = document.querySelector("#run");
  let runController = new AbortController();
  let isRunning = false;
  d3.select("#form").on("submit", async (e) => {
    e.preventDefault();
    if (isRunning) {
      stopRunning();
    } else {
      startRunning();
      await run(containers, runController);
      stopRunning();
    }
  });

  function startRunning() {
    isRunning = true;
    runBtn.innerText = "Stop";
  }
  function stopRunning() {
    runBtn.innerText = "Run";
    runController.abort();
    runController = new AbortController();
    isRunning = false;
  }
});
