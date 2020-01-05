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

class LinkedHashMap<T> {

    private threshold: number;
    private loadFactor: number;
    private modCount: number = 0;

    public size: number = 0;
    public buckets: Array<Entry<T>>;
    public header: Entry<T>;

    constructor(initialCapacity = 11, loadFactor = 0.75) {
        this.threshold = Math.floor(initialCapacity * loadFactor);
        this.loadFactor = loadFactor;

        this.buckets = new Array(initialCapacity);

        this.header = new Entry(undefined, undefined, undefined);
        this.header.before = this.header;
        this.header.after = this.header
    }

    isEmpty() { return this.size === 0; }

    hashCode(str: string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash += Math.pow(str.charCodeAt(i) * 31, str.length - i);
            hash = hash & hash;
        }
        return hash;
    }

    hash(key: string) {
        return Math.abs(this.hashCode(key) % this.buckets.length);
    }

    get(key: string): T {
        let idx = this.hash(key);
        let entry = this.buckets[idx];
        while (entry !== undefined) {
            if (key === entry.key) return entry.value;
            entry = entry.next;
        }
        return undefined;
    }

    containsKey(key: string): boolean {
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

    addEntry(key: string, value: T, idx: number, callRemove: boolean) {
        let old = this.buckets[idx];
        let entry = new Entry(key, value, old);
        this.buckets[idx] = entry;
        entry.addBefore(this.header);
    }

    put(key: string, value: T): T {
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
                return res;
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

        return undefined;
    }

    putAll(inputMap: Array<[string, T]>) {
        if (inputMap === undefined) { return; }
        for (const entry of inputMap) {
            let [key, value] = entry;
            this.put(key, value);
        }
    }


    remove(key: string): T {
        let idx = this.hash(key);
        let entry: Entry<T> = this.buckets[idx];
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

                return entry.cleanUp();
            }
            last = entry;
            entry = entry.next;
        }
        return undefined;
    }

    clear() {
        if (this.size !== 0) {
            this.modCount += 1;
            this.buckets = Array(this.size);
            this.size = 0;
        }
    }

    [Symbol.iterator]() {
        let knownMod = this.modCount;
        let count = this.size;
        let idx = this.buckets.length;

        let nextEntry = this.header.after;
        let lastReturned = undefined;


        let iter_hasNext = () => {
            return nextEntry !== this.header;
        }

        let iter_next = () => {
            let entry = lastReturned = nextEntry;
            nextEntry = entry.after;
            return entry;
        }

        let iter_remove = () => {
            this.remove(lastReturned.key);
            lastReturned = undefined;
        }
        return {
            next: () => {
                if (iter_hasNext()) return { value: iter_next(), done: false };
                else return { done: true };
            }
        };
    }

    containsValue(value: T): boolean {
        for (const entry of this) {
            if (entry.value === value) {
                return true;
            }
        }
        return false;
    }

    forEach(callback) {
        for (const entry of this)
            callback(entry);
    }

    map(callback) {
        const resultArray = [];

        for (const entry of this) {
            let res = callback(entry.key, entry.value);
            resultArray.push(res);
        }

        return resultArray;
    }

    foldl(ini, callback) {
        let result = ini;
        for (const entry of this) {
            result = callback(result, [entry.key, entry.value]);
        }
        return result;
    }
}
