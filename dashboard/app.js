/***********************************************************
 *  ACCESS GUARD – restrict dashboard to logged-in users
 ***********************************************************/
if (window.netlifyIdentity) {
    // Wait for Netlify Identity to initialize
    window.netlifyIdentity.on("init", user => {
        if (!user) {
            // No user session → redirect to home
            window.location.replace("/");
        }
    });

    // If the widget hasn’t been initialized yet, call init()
    window.netlifyIdentity.init();
} else {
    // Netlify Identity script missing → fallback redirect
    window.location.replace("/");
}


// ======== CONFIG ========
const BRANCH = "main";                         // change if your default branch is "master"
const PHOTOS_PATH = "/assets/gallery/photoshoots";
const BRAND_PATH = "/assets/gallery/brand-shoots";
const DATA_PATH = "/data/gallery.json";

// ======== STATE ========
let state = {
    tab: "photoshoots",  // or "brand"
    json: { photoshoots: [], brand: [] },
    dirty: false,
    user: null,
    repoHeadSha: null,   // latest commit SHA on BRANCH
    baseTreeSha: null,   // tree SHA of latest commit
    queueUploads: []     // [{file, path, base64}]
};

// ======== UTIL ========
const $ = sel => document.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else n.setAttribute(k, v);
    }
    for (const k of kids) n.append(k);
    return n;
};

const toast = (msg, kind = "ok") => {
    const t = el("div", { class: `badge ${kind}` }, msg);
    $(".dash-header").append(t);
    setTimeout(() => t.remove(), 2500);
};

const toBase64 = file => new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result.split(",")[1]);
    fr.onerror = rej;
    fr.readAsDataURL(file);
});

// ======== AUTH (Netlify Identity) ========
function requireLogin() {
    if (window.netlifyIdentity) {
        const u = window.netlifyIdentity.currentUser();
        if (!u) {
            $("#loginBtn").classList.remove("hidden");
            $("#userBox").classList.add("hidden");
            throw new Error("Not authenticated");
        }
        $("#loginBtn").classList.add("hidden");
        $("#userBox").classList.remove("hidden");
        $("#userEmail").textContent = u.email || "Logged in";
        state.user = u;
        return u;
    } else {
        throw new Error("Netlify Identity not loaded");
    }
}

// ======== GIT GATEWAY API (proxied) ========
// We use /.netlify/git/github/* endpoints with Bearer token from Identity.
async function gw(path, opts = {}) {
    const user = requireLogin();
    const token = await user.jwt(); // Bearer JWT
    const headers = Object.assign({
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
    }, opts.headers || {});
    const resp = await fetch(`/.netlify/git/github${path}`, { ...opts, headers });
    if (!resp.ok) {
        const tx = await resp.text().catch(() => "");
        throw new Error(`${resp.status} ${resp.statusText} at ${path}\n${tx}`);
    }
    if (resp.status === 204) return {};
    return resp.json();
}

// Get the current HEAD commit SHA for BRANCH
async function getHeadRef() {
    const ref = await gw(`/git/refs/heads/${BRANCH}`, { method: "GET" });
    return ref.object.sha; // commit SHA
}

// Get commit -> tree sha
async function getCommit(commitSha) {
    return gw(`/git/commits/${commitSha}`, { method: "GET" });
}

// Create a blob from base64 content
async function createBlob(base64) {
    return gw(`/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: base64, encoding: "base64" })
    });
}

// Create a tree from entries
async function createTree(baseTreeSha, entries) {
    return gw(`/git/trees`, {
        method: "POST",
        body: JSON.stringify({ base_tree: baseTreeSha, tree: entries })
    });
}

// Create a commit
async function createCommit(message, treeSha, parentCommitSha) {
    const user = requireLogin();
    const author = { name: user.user_metadata?.full_name || user.email, email: user.email, date: new Date().toISOString() };
    return gw(`/git/commits`, {
        method: "POST",
        body: JSON.stringify({ message, tree: treeSha, parents: [parentCommitSha], author })
    });
}

// Move branch ref forward
async function updateRef(commitSha) {
    return gw(`/git/refs/heads/${BRANCH}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commitSha, force: false })
    });
}

// ======== DATA LOAD ========
async function loadJson() {
    const resp = await fetch(DATA_PATH, { cache: "no-store" });
    if (!resp.ok) throw new Error("Failed to load gallery.json");
    const json = await resp.json();
    // normalize structure
    json.photoshoots ||= [];
    json.brand ||= [];
    state.json = json;
}

// ======== UI RENDER ========
function activeList() {
    return state.tab === "photoshoots" ? state.json.photoshoots : state.json.brand;
}

function setDirty(v = true) {
    state.dirty = v;
    $("#saveBtn").disabled = !v;
}

function renderGrid() {
    const list = activeList();
    const grid = $("#grid");
    grid.innerHTML = "";

    if (!list.length) {
        $("#emptyHint").classList.remove("hidden");
        return;
    } else {
        $("#emptyHint").classList.add("hidden");
    }

    list
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.caption || "").localeCompare(b.caption || ""))
        .forEach((item, idx) => {
            const img = el("img", { src: item.src, alt: item.alt || "" });
            const order = el("input", { type: "number", value: item.order ?? idx, min: "0" });
            const alt = el("input", { type: "text", value: item.alt || "", placeholder: "Alt text" });
            const cap = el("input", { type: "text", value: item.caption || "", placeholder: "Caption" });

            order.addEventListener("input", () => { item.order = Number(order.value); setDirty(); });
            alt.addEventListener("input", () => { item.alt = alt.value; setDirty(); });
            cap.addEventListener("input", () => { item.caption = cap.value; setDirty(); });

            const removeBtn = el("button", { class: "btn" }, "Remove");
            removeBtn.addEventListener("click", () => {
                const arr = activeList();
                const i = arr.indexOf(item);
                if (i >= 0) arr.splice(i, 1);
                setDirty(); renderGrid();
            });

            const card = el("div", { class: "card" },
                img,
                el("div", { class: "body" },
                    el("label", {}, "Order"), order,
                    el("label", {}, "Alt"), alt,
                    el("label", {}, "Caption"), cap,
                    el("div", { class: "actions" }, removeBtn),
                ),
                el("div", { class: "meta" },
                    el("span", { class: "path", title: item.src }, item.src.replace(/^\/assets\//, "assets/")),
                    el("span", { class: "badge ok" }, "Ready")
                )
            );
            grid.append(card);
        });
}

function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tab").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === tab);
    });
    renderGrid();
}

// ======== UPLOAD HANDLING ========
async function queueFiles(files, list, type) {
    for (const file of files) {
        // Use correct folder for brand vs photoshoots
        const realPath = type === "brand"
            ? `/assets/gallery/brand-shoots/${file.name}`
            : `/assets/gallery/photoshoots/${file.name}`;

        // Create local blob URL for instant preview
        const previewUrl = URL.createObjectURL(file);

        // Add new card to list
        list.push({
            src: previewUrl,       // shown immediately
            _realPath: realPath,   // actual CDN path used for commit
            alt: "",
            caption: "",
            order: list.length
        });

        // Convert file to base64 for Git commit
        const base64 = await toBase64(file);
        state.queueUploads.push({ file, path: realPath, base64 });
    }

    // Refresh grid and enable Save button
    renderGrid();
    setDirty();
}



// ======== SAVE (COMMIT) ========
async function saveChanges() {
    try {
        requireLogin();
        $("#saveBtn").disabled = true;

        /*************** STEP 1: prepare JSON for commit ***************/
        // Deep copy of state.json so we can keep blob previews on UI
        const commitData = JSON.parse(JSON.stringify(state.json));
        for (const type of ["photoshoots", "brand"]) {
            commitData[type].forEach(item => {
                if (item._realPath) item.src = item._realPath;
                delete item._realPath;
            });
        }

        /*************** STEP 2: get current repo state ***************/
        const headSha = await getHeadRef();
        const headCommit = await getCommit(headSha);
        const baseTreeSha = headCommit.tree.sha;

        /*************** STEP 3: upload new image blobs ***************/
        const treeEntries = [];
        for (const u of state.queueUploads) {
            const blob = await createBlob(u.base64);
            treeEntries.push({
                path: u.path.replace(/^\//, ""), // remove leading slash
                mode: "100644",
                type: "blob",
                sha: blob.sha
            });
        }

        /*************** STEP 4: upload updated gallery.json ***************/
        const newJsonStr = JSON.stringify(commitData, null, 2);
        const encoded = btoa(unescape(encodeURIComponent(newJsonStr)));
        const newJsonBlob = await createBlob(encoded);
        treeEntries.push({
            path: DATA_PATH.replace(/^\//, ""),
            mode: "100644",
            type: "blob",
            sha: newJsonBlob.sha
        });

        /*************** STEP 5: create commit and push ***************/
        const newTree = await createTree(baseTreeSha, treeEntries);
        const msg = `Dashboard: update ${state.tab} (${new Date().toISOString()})`;
        const commit = await createCommit(msg, newTree.sha, headSha);
        await updateRef(commit.sha);

        /*************** STEP 6: cleanup & UI feedback ***************/
        state.queueUploads = [];
        setDirty(false);
        toast("✅ Saved! Images will update after Netlify redeploy.", "ok");

        // Keep blob previews visible instead of reloading stale JSON
        renderGrid();

    } catch (err) {
        toast(err.message || "Save failed", "err");
        $("#saveBtn").disabled = false;
    }
}


// ======== BOOT ========
async function boot() {
    // Bind UI
    const branchEl = $("#branchName");
    if (branchEl) branchEl.textContent = BRANCH;
    $("#loginBtn").addEventListener("click", () => window.netlifyIdentity.open());
    $("#logoutBtn").addEventListener("click", () => window.netlifyIdentity.logout());
    document.querySelectorAll(".tab").forEach(b => {
        b.addEventListener("click", () => switchTab(b.dataset.tab));
    });
    // File upload button
    $("#fileInput").addEventListener("change", e => {
        const files = e.target.files;
        const targetList = state.tab === "brand" ? state.json.brand : state.json.photoshoots;
        const targetType = state.tab === "brand" ? "brand" : "photoshoots";
        queueFiles(files, targetList, targetType);
    });
    $("#saveBtn").addEventListener("click", () => saveChanges().catch(err => { toast(err.message, "err"); $("#saveBtn").disabled = false; }));

    // Drag & drop
    const dz = $("#dropzone");
    ["dragenter", "dragover"].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "drop"].forEach(evt => dz.addEventListener(evt, e => { e.preventDefault(); dz.classList.remove("drag"); }));
    dz.addEventListener("drop", e => {
        const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith("image/"));
        if (files.length) {
            const targetList = state.tab === "brand" ? state.json.brand : state.json.photoshoots;
            const targetType = state.tab === "brand" ? "brand" : "photoshoots";
            queueFiles(files, targetList, targetType);
        }
    });

    // Netlify Identity events
    if (window.netlifyIdentity) {
        window.netlifyIdentity.on("login", async () => { location.reload(); });
        window.netlifyIdentity.on("logout", () => { location.reload(); });
    }

    // Load data
    await loadJson();
    renderGrid();
}
boot().catch(err => toast(err.message || "Failed to init", "err"));
