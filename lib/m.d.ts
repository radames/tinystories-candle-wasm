/* tslint:disable */
/* eslint-disable */
/**
*/
export class Model {
  free(): void;
/**
* @param {Uint8Array} weights
* @param {Uint8Array} tokenizer
*/
  constructor(weights: Uint8Array, tokenizer: Uint8Array);
/**
* @returns {number}
*/
  get_seq_len(): number;
/**
* @param {string} prompt
* @param {number} temp
* @param {number} top_p
* @param {number} repeat_penalty
* @param {bigint} seed
* @returns {string}
*/
  init_with_prompt(prompt: string, temp: number, top_p: number, repeat_penalty: number, seed: bigint): string;
/**
* @returns {string}
*/
  next_token(): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_model_free: (a: number) => void;
  readonly model_new: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly model_get_seq_len: (a: number) => number;
  readonly model_init_with_prompt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly model_next_token: (a: number, b: number) => void;
  readonly main: (a: number, b: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
