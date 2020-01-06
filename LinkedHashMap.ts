namespace LHMap {

    export class LinkedHashMap<V> implements Map<string, V> {

        private threshold: number;
        private loadFactor: number;
        private modCount: number = 0;

        public size: number = 0;
        public buckets: Array<Entry<V>>;
        public header: Entry<V>;

        constructor(initialCapacity = 11, loadFactor = 0.75) {
            this.threshold = Math.floor(initialCapacity * loadFactor);
            this.loadFactor = loadFactor;

            this.buckets = new Array(initialCapacity);

            this.header = new Entry(undefined, undefined, undefined);
            this.header.before = this.header;
            this.header.after = this.header
        }

        isEmpty(): boolean { return this.size === 0; }

        hashCode(str: string): number {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash += Math.pow(str.charCodeAt(i) * 31, str.length - i);
                hash = hash & hash;
            }
            return hash;
        }

        hash(key: string): number {
            return Math.abs(this.hashCode(key) % this.buckets.length);
        }

        get(key: string): V {
            let idx = this.hash(key);
            let entry = this.buckets[idx];
            while (entry !== undefined) {
                if (key === entry.key) return entry.value;
                entry = entry.next;
            }
            return undefined;
        }

        has(key: string): boolean {
            let idx = this.hash(key);
            let entry = this.buckets[idx];
            while (entry !== undefined) {
                if (key === entry.key)
                    return true;
                entry = entry.next;
            }
            return false;
        }

        rehash(): void {
            let newCapacity = (this.buckets.length * 2) + 1;
            this.threshold = Math.floor(newCapacity * this.loadFactor);
            let newBuckets = new Array(newCapacity);

            for (let e = this.header.after; e != this.header; e = e.after) {
                let idx = this.hash(e.key);
                e.next = newBuckets[idx];
                newBuckets[idx] = e;
            }

            this.buckets = newBuckets;
        }

        addEntry(key: string, value: V, idx: number, callRemove: boolean): void {
            let old = this.buckets[idx];
            let entry = new Entry(key, value, old);
            this.buckets[idx] = entry;
            entry.addBefore(this.header);
        }

        set(key: string, value: V) {
            if (key === undefined || key === null)
                throw new Error("put: Key must be valid string")

            let idx = this.hash(key);
            let entry = this.buckets[idx];

            while (entry !== undefined) {
                if (key === entry.key) {
                    let res = entry.value;
                    entry.value = value;
                    entry.remove();
                    entry.addBefore(this.header);
                    return this;
                } else {
                    entry = entry.next;
                }
            }

            this.modCount += 1;
            this.size += 1;

            if (this.size > this.threshold) {
                this.rehash();
                idx = this.hash(key);
            }

            this.addEntry(key, value, idx, true);

            return this;
        }

        putAll(inputMap: Array<[string, V]>): void {
            if (inputMap === undefined) { return; }
            for (const entry of inputMap) {
                let [key, value] = entry;
                this.set(key, value);
            }
        }

        delete(key: string): boolean {
            let idx = this.hash(key);
            let entry: Entry<V> = this.buckets[idx];
            let last = undefined;

            while (entry !== undefined) {
                if (key === entry.key) {
                    this.modCount += 1;

                    if (last === undefined) {
                        this.buckets[idx] = entry.next;
                    } else {
                        last.next = entry.next;
                    }
                    this.size -= 1;
                    return true;
                    // return entry.cleanUp();
                }
                last = entry;
                entry = entry.next;
            }
            return false;
        }

        clear() {
            if (this.size !== 0) {
                this.modCount += 1;
                this.buckets = Array(this.size);
                this.size = 0;
            }
        }

        forEach(callbackfn: (value: V, key: string, map: Map<string, V>) => void, thisArg?: any): void {
            let iter = this._iterator();
            var nxt = iter.next();
            while (!nxt.done) {
                callbackfn(nxt.value[1], nxt.value[0], this);
                nxt = iter.next();
            }
        }

        get [Symbol.toStringTag](): string {
            return "LinkedHashMap";
        }

        * values(): IterableIterator<V> {
            let tmp = this.header;
            let nextEntry = tmp.after;

            while (tmp !== nextEntry) {
                yield nextEntry.value;
                nextEntry = nextEntry.after;
            }
        }

        * keys(): IterableIterator<string> {
            let tmp = this.header;
            let nextEntry = tmp.after;

            while (tmp !== nextEntry) {
                yield nextEntry.key;
                nextEntry = nextEntry.after;
            }
        }

        private *_iterator(): IterableIterator<[string, V]> {
            let tmp = this.header;
            let nextEntry = tmp.after;

            while (tmp !== nextEntry) {
                yield [nextEntry.key, nextEntry.value];
                nextEntry = nextEntry.after;
            }
        }

        [Symbol.iterator](): IterableIterator<[string, V]> {
            return this._iterator();
        }

        entries(): IterableIterator<[string, V]> {
            return this._iterator();
        }

        containsValue(value: V): boolean {
            for (const entry of this) {
                if (entry[1] === value) return true;
            }
            return false;
        }

        map<R>(callbackfn: (value: V, key: string, map: Map<string, V>) => R): Array<R> {
            const resultArray: R[] = [];

            for (const entry of this) {
                let res = callbackfn(entry[1], entry[0], this);
                resultArray.push(res);
            }

            return resultArray;
        }

        foldl(ini, callback) {
            let result = ini;
            for (const entry of this) {
                result = callback(result, [entry[1], entry[0]]);
            }
            return result;
        }
    }

    class Entry<V> {

        public key: string;
        public value: V;
        public next?: Entry<V>;
        public before?: Entry<V>;
        public after?: Entry<V>;

        constructor(key: string, value: V, next = undefined) {
            this.key = key;
            this.value = value;
            this.next = next;

            this.before = undefined;
            this.after = undefined;
        }

        remove() {
            this.before.after = this.after;
            this.after.before = this.before;
        }

        addBefore(existingEntry: Entry<V>) {
            this.after = existingEntry;
            this.before = existingEntry.before;
            this.before.after = this;
            this.after.before = this;
        }

        cleanUp() {
            return this.value;
        }
    }
}
