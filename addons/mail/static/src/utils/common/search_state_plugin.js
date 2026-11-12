import { useSequential } from "@mail/utils/common/hooks";

import { onWillDestroy, Plugin, signal, t, useConfig, useOnChange, useScope } from "@odoo/owl";

import { batched } from "@web/core/utils/timing";

/**
 * Shared search state machine for components that combine an optional async
 * fetch (typically an RPC) with an optional sync local lookup. Exposes reactive
 * fields (`searchTerm`, `searching`, `loading`, `results`) and methods (`run`,
 * `reset`). Subclass to add domain-specific fields while sharing the base logic.
 *
 * Narrow-dedup: if `fetch` resolves to `false` for some term, the next term
 * that starts with it skips the fetch (a narrower query cannot have results
 * when the broader one had none). Resolve to anything else to disable this for
 * the current bookmark. It is dropped when the deps change and on `reset()`.
 *
 * @typedef {Object} Options
 * @property {(term: string, options: { abortSignal: AbortSignal }) => Promise<boolean | void>} [fetch]
 *  Async server call, aborted by the next fetch, even for the same term.
 *  Resolving to `false` signals "no results" for narrow-dedup.
 * @property {(term: string) => any} [filter]
 *  Sync local lookup that produces `results`. Runs on term/deps change
 *  (once per animation frame) and again after `fetch` resolves
 *  (to pick up server-loaded data).
 * @property {any} [initialResults]
 *  Value assigned to `results` on reset. Defaults to an empty array.
 * @property {() => any[]} [deps]
 *  Extra reactive values read inside `fetch`/`filter`. Re-runs the search
 *  when they change.
 * @property {() => boolean} [isActive]
 *  Predicate deciding whether a search is active. Defaults to "term is
 *  non-empty". Override when a non-empty term is not the right signal
 *  (e.g. a mention popover stays active for an empty term as long as
 *  a delimiter is set).
 * @property {import("@odoo/owl").Signal<string>} [searchTerm]
 *  Signal holding the term when it is owned elsewhere (e.g. a field of
 *  a record the rest of the UI reads). Reads and writes go straight
 *  through to it, so there is no second copy to keep in sync.
 *  Defaults to a local signal.
 */
export class SearchStatePlugin extends Plugin {
    static id = "search_state";
    /** @type {Options} */
    options = useConfig("options", t.object().optional({}));

    /**
     * Backing store of {@link searchTerm}, a local signal unless the parent
     * passed one through the `searchTerm` option.
     *
     * @type {import("@odoo/owl").Signal<string>}
     */
    _searchTerm = signal("");
    /** Whether {@link _searchTerm} is ours to clear, i.e. not the parent's. */
    ownsSearchTerm = true;
    _searching = signal(false);
    _loading = signal(false);
    /** @type {import("@odoo/owl").Signal<any>} */
    _results = signal();
    /** @type {string | undefined} */
    lastEmptyTerm;
    /** @type {Function | undefined} */
    sequential;
    initialResults;
    /** @type {((term: string, options: { abortSignal: AbortSignal }) => Promise<boolean | void>) | null} */
    fetch = null;
    /** @type {((term: string) => any) | null} */
    filter = null;
    /** @type {(() => boolean) | null} */
    isActiveGetter = null;
    /** @type {(() => any[]) | null} */
    depsGetter = null;

    setup() {
        const { initialResults = [], fetch, filter, isActive, deps, searchTerm } = this.options;
        if (searchTerm) {
            this._searchTerm = searchTerm;
            this.ownsSearchTerm = false;
        }
        this.initialResults = initialResults;
        this.results = initialResults;
        if (fetch) {
            this.fetch = fetch;
        }
        if (filter) {
            this.filter = filter;
        }
        if (isActive) {
            this.isActiveGetter = isActive;
        }
        if (deps) {
            this.depsGetter = deps;
        }
        this.sequential = useSequential();
        const scope = useScope();
        // once per animation frame, like the rendering: searching on each change
        // (e.g. each typed character) would fetch every intermediate term
        const update = batched(
            () => {
                if (scope.isDestroyed()) {
                    return;
                }
                if (!this.isActive) {
                    this.reset();
                    return;
                }
                if (this.filter) {
                    this.results = this.filter(this.searchTerm);
                }
                this.run();
            },
            () => new Promise((resolve) => requestAnimationFrame(resolve))
        );
        useOnChange(
            () => this.deps,
            () => {
                this.lastEmptyTerm = undefined;
            }
        );
        useOnChange(
            () => [this.searchTerm, ...this.deps],
            () => {
                update();
            }
        );
        onWillDestroy(() => this.reset());
    }

    get searchTerm() {
        return this._searchTerm();
    }

    set searchTerm(value) {
        this._searchTerm.set(value);
    }

    get searching() {
        return this._searching();
    }

    set searching(value) {
        this._searching.set(value);
    }

    get loading() {
        return this._loading();
    }

    set loading(value) {
        this._loading.set(value);
    }

    get results() {
        return this._results();
    }

    set results(value) {
        this._results.set(value);
    }

    get isActive() {
        return this.isActiveGetter ? this.isActiveGetter() : !!this.searchTerm;
    }

    get deps() {
        return this.depsGetter?.() ?? [];
    }

    reset() {
        if (this.ownsSearchTerm) {
            this.searchTerm = "";
        }
        this.searching = false;
        this.loading = false;
        this.results = this.initialResults;
        this.lastEmptyTerm = undefined;
    }

    async run({ skipFetch = false } = {}) {
        if (!this.isActive) {
            this.reset();
            return;
        }
        const term = this.searchTerm;
        this.searching = true;
        if (this.lastEmptyTerm !== undefined && term.startsWith(this.lastEmptyTerm)) {
            // Broader term already had no results, so the narrower term
            // can't either — skip both the fetch and the local filter.
            return;
        }
        if (this.fetch && !skipFetch) {
            await this.sequential(async (abortSignal) => {
                if (!this.isActive) {
                    return;
                }
                this.loading = true;
                let result;
                try {
                    result = await this.fetch(term, { abortSignal });
                } catch (e) {
                    if (!abortSignal.aborted) {
                        throw e;
                    }
                } finally {
                    if (this.searchTerm === term) {
                        this.loading = false;
                    }
                }
                if (this.searchTerm === term) {
                    if (this.filter) {
                        this.results = this.filter(term);
                    }
                    this.lastEmptyTerm = result === false ? term : undefined;
                }
            });
        } else if (this.filter) {
            this.results = this.filter(term);
        }
    }
}
